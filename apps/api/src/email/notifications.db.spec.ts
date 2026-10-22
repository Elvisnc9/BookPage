// Runs against the real database (pnpm test:db): which emails go out, to whom, and reminders.
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { addDays, localDate } from '@bookpage/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { RemindersService } from '../reminders/reminders.service';
import { EmailService, type Outgoing } from './email.service';
import { manageToken } from './links';

const HOUR = 3_600_000;
let app: INestApplication;
let prisma: PrismaService;
let email: EmailService;
let reminders: RemindersService;
let base: string;
let ownerId: string;
let businessId: string;
let slug: string;
let serviceId: string;
let staffId: string;

const ownerEmail = `owner-${randomUUID().slice(0, 8)}@bookpage.test`;
const tomorrow = () => addDays(localDate(new Date(), 'UTC').date, 1);

async function post(path: string, body: unknown) {
  const res = await fetch(`${base}/public/${slug}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

/** Emails are sent in the background after the response; wait for them. */
async function sent(kind: string, count = 1): Promise<Outgoing[]> {
  for (let i = 0; i < 100; i++) {
    const found = email.outbox.filter((e) => e.kind === kind);
    if (found.length >= count) return found;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`No ${kind} email`);
}

/** A booking inserted directly, for reminder tests. */
async function seedBooking(opts: { startsIn: number; bookedAgo: number; consent?: boolean; status?: 'confirmed' | 'pending' }) {
  const customer = await prisma.customer.create({
    data: {
      businessId,
      name: 'Rem Inder',
      email: `rem-${randomUUID().slice(0, 8)}@example.com`,
      remindersConsentAt: opts.consent === false ? null : new Date(),
    },
  });
  const now = Date.now();
  const startsAt = new Date(Math.round((now + opts.startsIn) / 60_000) * 60_000);
  return prisma.booking.create({
    data: {
      businessId,
      serviceId,
      staffId,
      customerId: customer.id,
      status: opts.status ?? 'confirmed',
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR),
      blockedUntil: new Date(startsAt.getTime() + HOUR),
      createdAt: new Date(now - opts.bookedAgo),
      serviceName: 'Cut',
      durationMin: 60,
      priceType: 'fixed',
      priceMinor: 3000,
      currency: 'USD',
    },
  });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  base = await app.getUrl();
  prisma = app.get(PrismaService);
  email = app.get(EmailService);
  reminders = app.get(RemindersService);
  expect(email.live).toBe(false); // never send real email from tests

  slug = `test-${randomUUID().slice(0, 8)}`;
  ownerId = (await prisma.user.create({ data: { clerkUserId: `user_test_${randomUUID()}`, email: ownerEmail } })).id;
  const business = await prisma.business.create({
    data: {
      ownerId,
      slug,
      name: 'Mail Test Salon',
      email: 'hello@mailtest.example',
      timezone: 'UTC',
      currency: 'USD',
      publishedAt: new Date(),
      hours: { create: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, opensAt: 0, closesAt: 1440 })) },
      bookingRules: { create: { minNoticeMin: 0, slotStepMin: 30, customerFields: { phone: 'off', note: 'optional' } } },
    },
  });
  businessId = business.id;
  serviceId = (await prisma.service.create({
    data: { businessId, name: 'Cut', priceType: 'fixed', priceMinor: 3000, durationMin: 60 },
  })).id;
  staffId = (await prisma.staff.create({ data: { businessId, name: 'Ana', services: { create: { serviceId } } } })).id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { businessId } });
  await prisma.enquiry.deleteMany({ where: { businessId } });
  await prisma.user.delete({ where: { id: ownerId } });
  await app.close();
});

beforeEach(() => {
  email.outbox.length = 0;
});

describe('booking emails', () => {
  it('confirms to the customer and alerts the owner', async () => {
    const { status, json } = await post('/bookings', {
      serviceId,
      startsAt: `${tomorrow()}T09:00:00.000Z`,
      customer: { name: 'Dana Whitfield', email: 'dana@example.com', note: 'Fine hair' },
      remindersConsent: true,
    });
    expect(status).toBe(201);
    const id = json.booking.id as string;

    const [confirmation] = await sent('booking-confirmation');
    expect(confirmation).toMatchObject({
      to: 'dana@example.com',
      fromName: 'Mail Test Salon via BookPage',
      replyTo: 'hello@mailtest.example',
      idempotencyKey: `booking-confirmation/${id}`,
    });
    expect(confirmation!.subject).toMatch(/^Booked: Cut at Mail Test Salon/);

    // The link in the email is the same secret the confirmation page received.
    expect(json.manageToken).toBe(manageToken(id));
    expect(confirmation!.text).toContain(`/booked/${id}?t=${json.manageToken}`);
    const view = await fetch(`${base}/public/${slug}/bookings/${id}?token=${json.manageToken}`);
    expect(view.status).toBe(200);

    const [alert] = await sent('owner-new-booking');
    expect(alert).toMatchObject({ to: ownerEmail, replyTo: 'dana@example.com' });
    expect(alert!.text).toContain('Note: Fine hair');
  });

  it('tells the owner when a customer cancels', async () => {
    const { json } = await post('/bookings', {
      serviceId,
      startsAt: `${tomorrow()}T12:00:00.000Z`,
      customer: { name: 'Sam Cancel', email: 'sam@example.com' },
    });
    await post(`/bookings/${json.booking.id}/cancel`, { token: json.manageToken });
    const [cancelled] = await sent('owner-cancelled');
    expect(cancelled).toMatchObject({ to: ownerEmail });
    expect(cancelled!.subject).toMatch(/^Cancelled: Sam Cancel, Cut/);
  });

  it('forwards enquiries to the owner with the customer as reply-to', async () => {
    await post('/enquiries', { message: 'Do you do weddings?', customer: { name: 'Bride', email: 'bride@example.com' } });
    const [enquiry] = await sent('owner-enquiry');
    expect(enquiry).toMatchObject({ to: ownerEmail, replyTo: 'bride@example.com' });
    expect(enquiry!.text).toContain('Do you do weddings?');
  });
});

describe('day-before reminders', () => {
  it('sends one reminder for a booking made well ahead, exactly once', async () => {
    const booking = await seedBooking({ startsIn: 20 * HOUR, bookedAgo: 3 * 24 * HOUR });
    const first = await reminders.run(new Date());
    expect(first.sent).toBeGreaterThanOrEqual(1);
    const mine = email.outbox.filter((e) => e.idempotencyKey === `booking-reminder/${booking.id}`);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.subject).toMatch(/^Tomorrow: Cut at Mail Test Salon/);
    expect(mine[0]!.text).toContain(`/booked/${booking.id}?t=${manageToken(booking.id)}`);

    await reminders.run(new Date());
    expect(email.outbox.filter((e) => e.idempotencyKey === `booking-reminder/${booking.id}`)).toHaveLength(1);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).reminderSentAt).not.toBeNull();
  });

  it('skips customers who said no, late bookings, pending ones and ones too far off or too close', async () => {
    const skipped = await Promise.all([
      // One staff member, so each sits in its own non-overlapping hour.
      seedBooking({ startsIn: 4 * HOUR, bookedAgo: 3 * 24 * HOUR, consent: false }),
      seedBooking({ startsIn: 6 * HOUR, bookedAgo: 5 * HOUR }), // booked less than a day ahead
      seedBooking({ startsIn: 8 * HOUR, bookedAgo: 3 * 24 * HOUR, status: 'pending' }),
      seedBooking({ startsIn: 30 * HOUR, bookedAgo: 3 * 24 * HOUR }), // not tomorrow yet
      seedBooking({ startsIn: 1 * HOUR, bookedAgo: 3 * 24 * HOUR }), // too close
    ]);
    await reminders.run(new Date());
    const keys = new Set(email.outbox.map((e) => e.idempotencyKey));
    for (const b of skipped) expect(keys.has(`booking-reminder/${b.id}`)).toBe(false);
  });

  it('releases the claim when sending fails, so the next run retries', async () => {
    const booking = await seedBooking({ startsIn: 12 * HOUR, bookedAgo: 3 * 24 * HOUR });
    const spy = vi.spyOn(email, 'send').mockRejectedValueOnce(new Error('Resend is down'));

    const failedRun = await reminders.run(new Date());
    expect(failedRun.failed).toBe(1);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).reminderSentAt).toBeNull();

    spy.mockRestore();
    await reminders.run(new Date());
    expect(email.outbox.some((e) => e.idempotencyKey === `booking-reminder/${booking.id}`)).toBe(true);
  });
});
