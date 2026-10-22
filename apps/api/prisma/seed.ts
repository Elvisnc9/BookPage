// Seeds one demo business, "Glow Studio" (glowstudio.localhost:4321 in dev),
// so the booking page and availability engine have real data to work with.
// Safe to re-run: the demo business is deleted and recreated each time.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { addDays, localDate, weekdayOf, zonedToUtc } from '@bookpage/shared';
import { PrismaClient } from '../src/generated/prisma/client';
import { TEMPLATE_CATALOGUE, toRow } from './templates';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const SLUG = 'glowstudio';
const h = (hours: number, minutes = 0) => hours * 60 + minutes;

/** Keeps dev in step with the launch catalogue. Production gets its rows from migrations. */
async function syncTemplates() {
  for (const [position, entry] of TEMPLATE_CATALOGUE.entries()) {
    const { id, ...row } = toRow(entry, position);
    await prisma.siteTemplate.upsert({ where: { slug: row.slug }, update: row, create: { id, ...row } });
  }
}

async function main() {
  await syncTemplates();
  // The demo owner is matched by email. Set DEMO_OWNER_EMAIL to the email you sign in to
  // Clerk with (locally) and your first sign-in is linked to Glow Studio's owner account.
  const demoEmail = (process.env.DEMO_OWNER_EMAIL || 'demo-owner@bookpage.app').trim().toLowerCase();
  const owner = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: { email: demoEmail, name: 'Maya Brooks' },
  });

  // Bookings restrict deletes of their customer/service/staff, so clear them first.
  const existing = await prisma.business.findUnique({ where: { slug: SLUG }, select: { id: true } });
  if (existing) {
    await prisma.booking.deleteMany({ where: { businessId: existing.id } });
    await prisma.enquiry.deleteMany({ where: { businessId: existing.id } });
    await prisma.business.delete({ where: { id: existing.id } });
  }

  const business = await prisma.business.create({
    data: {
      ownerId: owner.id,
      slug: SLUG,
      name: 'Glow Studio',
      category: 'hair_salon',
      description: 'Silk presses, braids and colour in a calm little studio off Bedford Ave.',
      locationType: 'premises',
      addressLine1: '214 Bedford Ave',
      city: 'Brooklyn',
      region: 'NY',
      postalCode: '11249',
      country: 'US',
      phone: '+17185550142',
      email: 'hello@glowstudio.example',
      timezone: 'America/New_York',
      currency: 'USD',
      onboardingStep: 5,
      publishedAt: new Date(),
      // Glow Studio is the page the Classic template was designed from.
      templateId: TEMPLATE_CATALOGUE.find((t) => t.slug === 'classic')!.id,
      bookingRules: { create: {} },
    },
  });

  // Tue–Fri 10:00–19:00, Sat 09:00–17:00, closed Sun & Mon.
  const hours = [
    ...[2, 3, 4, 5].map((weekday) => ({ weekday, opensAt: h(10), closesAt: h(19) })),
    { weekday: 6, opensAt: h(9), closesAt: h(17) },
  ];
  await prisma.openingHours.createMany({
    data: hours.map((range) => ({ ...range, businessId: business.id })),
  });

  const services = [
    { name: 'Silk press', priceType: 'fixed', priceMinor: 8500, durationMin: 90, bufferMin: 15 },
    { name: 'Knotless braids', priceType: 'from', priceMinor: 18000, durationMin: 240, bufferMin: 15 },
    { name: 'Trim & shape', priceType: 'fixed', priceMinor: 3500, durationMin: 30 },
    { name: 'Colour consultation', priceType: 'free', priceMinor: null, durationMin: 15 },
    { name: 'Bridal styling', priceType: 'quote', priceMinor: null, durationMin: 180, bookable: false },
  ] as const;

  const created: Awaited<ReturnType<typeof prisma.service.create>>[] = [];
  for (const [position, service] of services.entries()) {
    created.push(await prisma.service.create({ data: { ...service, position, businessId: business.id } }));
  }

  const bookable = created.filter((s) => s.bookable);
  const maya = await prisma.staff.create({
    data: {
      businessId: business.id,
      name: 'Maya',
      services: { create: bookable.map((s) => ({ serviceId: s.id })) },
    },
  });
  const jordan = await prisma.staff.create({
    data: {
      businessId: business.id,
      name: 'Jordan',
      position: 1,
      services: { create: bookable.filter((s) => s.name !== 'Knotless braids').map((s) => ({ serviceId: s.id })) },
    },
  });

  await prisma.faq.createMany({
    data: [
      { question: 'Do I need to wash my hair before a silk press?', answer: 'No, we wash and condition as part of the service.', approved: true, position: 0 },
      { question: 'Is there parking?', answer: 'Street parking on Bedford Ave and N 3rd St.', approved: true, position: 1 },
    ].map((faq) => ({ ...faq, businessId: business.id })),
  });

  // Local dev only: a few bookings so the dashboard has something to show. Production gets no fake customers.
  let sample = 0;
  if (process.env.NODE_ENV !== 'production') {
    const svc = (name: string) => created.find((s) => s.name === name)!;
    const tz = business.timezone;
    const today = localDate(new Date(), tz).date;
    const open = (from: string, step: 1 | -1) => {
      for (let d = from; ; d = addDays(d, step)) if (weekdayOf(d) >= 2 && weekdayOf(d) <= 6) return d;
    };
    const day0 = open(today, 1);
    const day1 = open(addDays(day0, 1), 1);
    const day2 = open(addDays(day1, 1), 1);
    const past = open(addDays(today, -1), -1);
    const at = (date: string, h: number, m = 0) => zonedToUtc(date, h * 60 + m, tz);

    const rows = [
      { who: 'Dana Whitfield', service: 'Silk press', staff: maya, start: at(day0, 11), status: 'confirmed', note: 'Shoulder length, fine hair' },
      { who: 'Chris Ortiz', service: 'Trim & shape', staff: jordan, start: at(day0, 12, 30), status: 'confirmed' },
      { who: 'Pat Lee', service: 'Trim & shape', staff: jordan, start: at(day0, 15, 45), status: 'pending' },
      { who: 'Ama Mensah', service: 'Knotless braids', staff: maya, start: at(day1, 10), status: 'confirmed', note: 'Waist length please' },
      { who: 'Sam Rivera', service: 'Colour consultation', staff: jordan, start: at(day1, 14), status: 'confirmed' },
      { who: 'Kim Novak', service: 'Silk press', staff: maya, start: at(day1, 16), status: 'cancelled' },
      { who: 'Riley Kim', service: 'Silk press', staff: maya, start: at(day2, 10, 30), status: 'pending' },
      { who: 'Lee Brown', service: 'Trim & shape', staff: jordan, start: at(past, 13), status: 'confirmed' },
    ] as const;

    for (const r of rows) {
      const s = svc(r.service);
      const customer = await prisma.customer.create({
        data: {
          businessId: business.id,
          name: r.who,
          email: `${r.who.split(' ')[0]!.toLowerCase()}@example.com`,
          phone: '+17185550123',
          remindersConsentAt: new Date(),
        },
      });
      const endsAt = new Date(r.start.getTime() + s.durationMin * 60_000);
      await prisma.booking.create({
        data: {
          businessId: business.id,
          serviceId: s.id,
          staffId: r.staff.id,
          customerId: customer.id,
          status: r.status,
          startsAt: r.start,
          endsAt,
          blockedUntil: new Date(endsAt.getTime() + s.bufferMin * 60_000),
          serviceName: s.name,
          durationMin: s.durationMin,
          priceType: s.priceType,
          priceMinor: s.priceMinor,
          currency: business.currency,
          customerNote: 'note' in r ? r.note : null,
          confirmedAt: r.status === 'confirmed' ? new Date() : null,
          cancelledAt: r.status === 'cancelled' ? new Date() : null,
          cancelReason: r.status === 'cancelled' ? 'Cancelled by customer' : null,
        },
      });
      sample++;
    }
  }

  console.log(`Seeded ${business.name} → ${SLUG}.localhost:4321 (${created.length} services, 2 staff, ${sample} sample bookings)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
