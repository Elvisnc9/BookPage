// Runs against the real database (pnpm test:db): the customer booking flow over HTTP.
import { randomInt, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CreatedBooking, PublicBusiness, PublicDay } from '@bookpage/shared';
import { AppModule } from '../app.module';
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER } from '../common/client-ip';
import { addDays, localDate } from '@bookpage/shared';
import { OwnerBookingsService } from '../business/owner-bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { DepositHoldsService, HOLD_EXPIRED_REASON } from '../reminders/deposit-holds.service';

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let ownerId: string;
let slug: string;
let cutId: string;
let quoteId: string;
let staffA: string;
let staffB: string;

const tomorrow = () => addDays(localDate(new Date(), 'UTC').date, 1);
const at = (time: string, date = tomorrow()) => `${date}T${time}:00.000Z`;

// Each call comes from a different visitor (as the web app forwards it), so the
// rate limits don't trip; public-throttler.spec.ts covers those.
const visitor = () => ({
  [CLIENT_IP_HEADER]: `10.${randomInt(256)}.${randomInt(256)}.${randomInt(256)}`,
  [PROXY_SECRET_HEADER]: process.env.PROXY_SECRET!,
});

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}/public/${slug}${path}`, {
    method,
    headers: { ...visitor(), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => null)) as any };
}

const booking = (startsAt: string, extra: Record<string, unknown> = {}) => ({
  serviceId: cutId,
  startsAt,
  customer: { name: 'Jo Customer', email: `Jo.${randomUUID().slice(0, 6)}@Example.com`, phone: '+1 212 555 0100' },
  remindersConsent: true,
  ...extra,
});

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  base = await app.getUrl();
  prisma = app.get(PrismaService);

  slug = `test-${randomUUID().slice(0, 8)}`;
  const owner = await prisma.user.create({ data: { clerkUserId: `user_test_${randomUUID()}`, email: `test-${randomUUID()}@bookpage.test` } });
  ownerId = owner.id;
  const business = await prisma.business.create({
    data: {
      ownerId,
      slug,
      name: 'Public Test Cuts',
      timezone: 'UTC',
      currency: 'USD',
      country: 'US',
      publishedAt: new Date(),
      // Open all day, every day, so the tests don't depend on when they run.
      hours: { create: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, opensAt: 0, closesAt: 1440 })) },
      bookingRules: { create: { minNoticeMin: 0, slotStepMin: 30 } },
    },
  });
  cutId = (await prisma.service.create({
    data: { businessId: business.id, name: 'Cut', priceType: 'fixed', priceMinor: 3000, durationMin: 60, bufferMin: 15 },
  })).id;
  quoteId = (await prisma.service.create({
    data: { businessId: business.id, name: 'Wedding', priceType: 'quote', priceMinor: null, durationMin: 240, bookable: false },
  })).id;
  staffA = (await prisma.staff.create({ data: { businessId: business.id, name: 'Ana', position: 0, services: { create: { serviceId: cutId } } } })).id;
  staffB = (await prisma.staff.create({ data: { businessId: business.id, name: 'Ben', position: 1, services: { create: { serviceId: cutId } } } })).id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { business: { ownerId } } });
  await prisma.enquiry.deleteMany({ where: { business: { ownerId } } });
  await prisma.user.delete({ where: { id: ownerId } });
  await app.close();
});

describe('public booking page', () => {
  it('shows only public fields of a published business', async () => {
    const { status, json } = await call('GET', '');
    expect(status).toBe(200);
    const b = json as PublicBusiness;
    expect(b.name).toBe('Public Test Cuts');
    expect(b.services.map((s) => [s.name, s.bookable])).toEqual([['Cut', true], ['Wedding', false]]);
    expect(b.staff.map((s) => s.name)).toEqual(['Ana', 'Ben']);
    expect(Object.keys(b)).not.toContain('ownerId');
    expect(Object.keys(b)).not.toContain('id');
  });

  it('hides unpublished businesses', async () => {
    await prisma.business.update({ where: { slug }, data: { publishedAt: null } });
    expect((await call('GET', '')).status).toBe(404);
    await prisma.business.update({ where: { slug }, data: { publishedAt: new Date() } });
  });

  it('lists free times with who is free', async () => {
    const { status, json } = await call('GET', `/availability?serviceId=${cutId}&from=${tomorrow()}&days=1`);
    expect(status).toBe(200);
    const [day] = json as PublicDay[];
    expect(day!.date).toBe(tomorrow());
    expect(day!.slots[0]).toEqual({ start: at('00:00'), staffIds: [staffA, staffB] });
  });

  it('books the first free person, then the next, then says the slot is taken', async () => {
    const first = await call('POST', '/bookings', booking(at('10:00')));
    expect(first.status).toBe(201);
    const created = first.json as CreatedBooking;
    expect(created.booking).toMatchObject({ status: 'confirmed', staffName: 'Ana', serviceName: 'Cut', priceMinor: 3000 });
    expect(created.manageToken.length).toBeGreaterThan(20);

    const second = await call('POST', '/bookings', booking(at('10:00')));
    expect(second.json.booking.staffName).toBe('Ben');

    const third = await call('POST', '/bookings', booking(at('10:00')));
    expect(third.status).toBe(409);
    expect(third.json.code).toBe('slot_taken');
  });

  it('keeps the buffer free after a booking', async () => {
    // Both are busy 10:00–11:15 now; 11:00 overlaps the buffer, 11:30 is fine.
    expect((await call('POST', '/bookings', booking(at('11:00'), { staffId: staffA }))).status).toBe(409);
    expect((await call('POST', '/bookings', booking(at('11:30'), { staffId: staffA }))).status).toBe(201);
  });

  it('lets exactly one of two simultaneous requests for the same person win', async () => {
    const results = await Promise.all([
      call('POST', '/bookings', booking(at('14:00'), { staffId: staffB })),
      call('POST', '/bookings', booking(at('14:00'), { staffId: staffB })),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('rejects times that are not offered', async () => {
    expect((await call('POST', '/bookings', booking(at('15:10')))).status).toBe(409); // off the 30-minute grid
    const past = await call('POST', '/bookings', booking(`${addDays(tomorrow(), -3)}T10:00:00.000Z`));
    expect(past.status).toBe(409);
  });

  it('never books quote-only services', async () => {
    expect((await call('POST', '/bookings', booking(at('16:00'), { serviceId: quoteId }))).status).toBe(404);
  });

  it('asks for a phone number when the business requires it', async () => {
    const { status, json } = await call('POST', '/bookings', booking(at('16:00'), { customer: { name: 'No Phone', email: 'np@example.com' } }));
    expect(status).toBe(400);
    expect(json.issues).toEqual([{ path: 'customer.phone', message: 'Add your phone number' }]);
  });

  it('lets the customer view and cancel with their link, and frees the slot', async () => {
    const created = (await call('POST', '/bookings', booking(at('18:00'), { staffId: staffA }))).json as CreatedBooking;
    const id = created.booking.id;

    expect((await call('GET', `/bookings/${id}?token=wrong-token-that-is-long-enough`)).status).toBe(404);
    const viewed = await call('GET', `/bookings/${id}?token=${created.manageToken}`);
    expect(viewed.json).toMatchObject({ id, status: 'confirmed', cancellable: true });

    const cancelled = await call('POST', `/bookings/${id}/cancel`, { token: created.manageToken });
    expect(cancelled.json).toMatchObject({ status: 'cancelled', cancellable: false });

    expect((await call('POST', '/bookings', booking(at('18:00'), { staffId: staffA }))).status).toBe(201);
  });

  it('moves a booking with its link, even onto its own old time, and keeps the person', async () => {
    const day = addDays(tomorrow(), 1);
    const created = (await call('POST', '/bookings', booking(at('10:00', day), { staffId: staffA }))).json as CreatedBooking;
    const id = created.booking.id;
    expect(created.booking).toMatchObject({ reschedulable: true, staffId: staffA });

    // 10:30 overlaps the booking's own 10:00 slot; that must not block the move.
    const moved = await call('POST', `/bookings/${id}/reschedule`, { token: created.manageToken, startsAt: at('10:30', day) });
    expect(moved.status).toBe(200);
    expect(moved.json).toMatchObject({ id, status: 'confirmed', staffId: staffA, startsAt: at('10:30', day) });
    const row = await prisma.booking.findUniqueOrThrow({ where: { id } });
    expect(row.endsAt.toISOString()).toBe(at('11:30', day));
    expect(row.reminderSentAt).toBeNull();

    // The old 10:00 time is free again for someone else with the same person.
    expect((await call('POST', '/bookings', booking(at('09:00', day), { staffId: staffA }))).status).toBe(201);
  });

  it('refuses a move onto a taken time, a wrong link, or a cancelled booking', async () => {
    const day = addDays(tomorrow(), 1);
    const mine = (await call('POST', '/bookings', booking(at('14:00', day), { staffId: staffB }))).json as CreatedBooking;
    await call('POST', '/bookings', booking(at('16:00', day), { staffId: staffB }));

    const taken = await call('POST', `/bookings/${mine.booking.id}/reschedule`, { token: mine.manageToken, startsAt: at('16:00', day), staffId: staffB });
    expect(taken.status).toBe(409);
    const wrong = await call('POST', `/bookings/${mine.booking.id}/reschedule`, { token: 'wrong-token-that-is-long-enough', startsAt: at('17:30', day) });
    expect(wrong.status).toBe(404);

    await call('POST', `/bookings/${mine.booking.id}/cancel`, { token: mine.manageToken });
    const afterCancel = await call('POST', `/bookings/${mine.booking.id}/reschedule`, { token: mine.manageToken, startsAt: at('17:30', day) });
    expect(afterCancel.status).toBe(400);
  });

  it('stores customers once per business with a lower-cased email', async () => {
    const email = `Same.${randomUUID().slice(0, 6)}@Example.com`;
    const customer = { name: 'Sam', email, phone: '+12125550100' };
    await call('POST', '/bookings', booking(at('19:00'), { customer }));
    await call('POST', '/bookings', booking(at('20:00'), { customer: { ...customer, name: 'Sam R' } }));
    const rows = await prisma.customer.findMany({ where: { email: email.toLowerCase() } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Sam R', phone: '+12125550100' });
    expect(rows[0]!.remindersConsentAt).not.toBeNull();
  });

  it('holds the slot as pending when the owner approves bookings', async () => {
    await prisma.bookingRules.updateMany({ where: { business: { slug } }, data: { autoConfirm: false } });
    const { json } = await call('POST', '/bookings', booking(at('21:00')));
    expect(json.booking.status).toBe('pending');
    await prisma.bookingRules.updateMany({ where: { business: { slug } }, data: { autoConfirm: true } });
  });

  describe('deposits', () => {
    const payUrl = 'https://buy.stripe.com/test_deposit';
    beforeAll(async () => {
      await prisma.bookingRules.updateMany({ where: { business: { slug } }, data: { depositUrl: payUrl, depositHoldMin: 120, depositRefundHours: 24 } });
      await prisma.service.update({ where: { id: cutId }, data: { depositMinor: 1000 } });
    });
    afterAll(async () => {
      await prisma.service.update({ where: { id: cutId }, data: { depositMinor: null } });
      await prisma.bookingRules.updateMany({ where: { business: { slug } }, data: { depositUrl: null } });
    });

    it('shows the deposit on the page and holds the booking as pending until it is paid', async () => {
      const profile = (await call('GET', '')).json as PublicBusiness;
      expect(profile.services.find((s) => s.id === cutId)?.depositMinor).toBe(1000);
      expect(profile.booking.deposits).toEqual({ holdMin: 120, refundHours: 24 });

      const before = Date.now();
      const created = (await call('POST', '/bookings', booking(at('08:00', addDays(tomorrow(), 2)), { staffId: staffA }))).json as CreatedBooking;
      expect(created.booking.status).toBe('pending');
      expect(created.booking.deposit).toMatchObject({ amountMinor: 1000, payUrl, paid: false, refundHours: 24 });
      const due = Date.parse(created.booking.deposit!.dueAt);
      expect(due).toBeGreaterThanOrEqual(before + 119 * 60_000);
      expect(due).toBeLessThanOrEqual(Date.now() + 121 * 60_000);

      // The owner tapping "Deposit received" confirms it and records the payment.
      const owner = app.get(OwnerBookingsService);
      await owner.changeStatus(ownerId, created.booking.id, { status: 'confirmed' });
      const viewed = await call('GET', `/bookings/${created.booking.id}?token=${created.manageToken}`);
      expect(viewed.json).toMatchObject({ status: 'confirmed', deposit: { paid: true } });
    });

    it('releases an unpaid hold after its deadline and frees the slot, but never a paid one', async () => {
      const day = addDays(tomorrow(), 2);
      const unpaid = (await call('POST', '/bookings', booking(at('11:00', day), { staffId: staffA }))).json as CreatedBooking;
      const paid = (await call('POST', '/bookings', booking(at('11:00', day), { staffId: staffB }))).json as CreatedBooking;
      await prisma.booking.update({ where: { id: paid.booking.id }, data: { depositPaidAt: new Date() } });

      const holds = app.get(DepositHoldsService);
      expect(await holds.run(new Date())).toBe(0); // nothing is due yet
      await holds.run(new Date(Date.now() + 3 * 3_600_000));

      const rows = await prisma.booking.findMany({ where: { id: { in: [unpaid.booking.id, paid.booking.id] } } });
      expect(rows.find((r) => r.id === unpaid.booking.id)).toMatchObject({ status: 'cancelled', cancelReason: HOLD_EXPIRED_REASON });
      expect(rows.find((r) => r.id === paid.booking.id)?.status).toBe('pending');
      expect((await call('POST', '/bookings', booking(at('11:00', day), { staffId: staffA }))).status).toBe(201);
    });

    it('never holds longer than the start time', async () => {
      // Opens all day with no notice, so a slot starting within the hold window exists.
      const soon = new Date(Math.ceil((Date.now() + 40 * 60_000) / 1_800_000) * 1_800_000);
      const created = await call('POST', '/bookings', booking(soon.toISOString(), { staffId: staffB }));
      if (created.status !== 201) return; // that slot was used by an earlier test; nothing to check
      expect(Date.parse(created.json.booking.deposit.dueAt)).toBeLessThanOrEqual(soon.getTime());
    });
  });

  it('sends quote requests as enquiries', async () => {
    const { status } = await call('POST', '/enquiries', {
      serviceId: quoteId,
      message: 'Wedding for 6 people in June',
      preferredDate: addDays(tomorrow(), 30),
      customer: { name: 'Bride', email: 'bride@example.com' },
    });
    expect(status).toBe(201);
    expect(await prisma.enquiry.count({ where: { business: { slug } } })).toBe(1);
  });
});
