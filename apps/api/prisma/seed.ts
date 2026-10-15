// Seeds one demo business, "Glow Studio" (glowstudio.localhost:4321 in dev),
// so the booking page and availability engine have real data to work with.
// Safe to re-run: the demo business is deleted and recreated each time.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const SLUG = 'glowstudio';
const h = (hours: number, minutes = 0) => hours * 60 + minutes;

async function main() {
  const owner = await prisma.user.upsert({
    where: { googleId: 'seed-demo-owner' },
    update: {},
    create: { googleId: 'seed-demo-owner', email: 'demo-owner@bookpage.app', name: 'Maya Brooks' },
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

  const created = [];
  for (const [position, service] of services.entries()) {
    created.push(await prisma.service.create({ data: { ...service, position, businessId: business.id } }));
  }

  const bookable = created.filter((s) => s.bookable);
  await prisma.staff.create({
    data: {
      businessId: business.id,
      name: 'Maya',
      services: { create: bookable.map((s) => ({ serviceId: s.id })) },
    },
  });
  await prisma.staff.create({
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

  console.log(`Seeded ${business.name} → ${SLUG}.localhost:4321 (${created.length} services, 2 staff)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
