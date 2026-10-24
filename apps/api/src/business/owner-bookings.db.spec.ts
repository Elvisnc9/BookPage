// Runs against the real database (pnpm test:db): the dashboard's bookings endpoints.
import { randomUUID } from 'node:crypto';
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { OwnerBooking, OwnerSummary } from '@bookpage/shared';
import { AppModule } from '../app.module';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

class TestSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (!req.headers['x-test-user']) return false;
    req.auth = { sessionId: 'test', userId: req.headers['x-test-user'] };
    return true;
  }
}

const HOUR = 3_600_000;
const ORIGIN = 'http://localhost:4321';
let app: INestApplication;
let prisma: PrismaService;
let email: EmailService;
let base: string;
let ownerId: string;
let otherOwnerId: string;
let businessId: string;
let serviceId: string;
let staffId: string;

async function call(method: string, path: string, body?: unknown, as = ownerId) {
  const res = await fetch(`${base}/business${path}`, {
    method,
    headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-test-user': as },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => null)) as any };
}

let minute = 0;
/** Bookings an hour apart so the one-staff overlap guard never trips. */
async function book(startsIn: number, status: 'pending' | 'confirmed' = 'confirmed') {
  const customer = await prisma.customer.create({
    data: { businessId, name: `Cust ${++minute}`, email: `c${minute}-${randomUUID().slice(0, 6)}@example.com`, phone: '+12125550100' },
  });
  const startsAt = new Date(Math.floor((Date.now() + startsIn) / HOUR) * HOUR + (minute % 1) * 60_000);
  return prisma.booking.create({
    data: {
      businessId, serviceId, staffId, customerId: customer.id, status, startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60_000),
      blockedUntil: new Date(startsAt.getTime() + 30 * 60_000),
      serviceName: 'Cut', durationMin: 30, priceType: 'fixed', priceMinor: 2500, currency: 'USD',
      customerNote: 'Please be gentle',
    },
  });
}

async function sent(kind: string) {
  for (let i = 0; i < 50; i++) {
    const found = email.outbox.filter((e) => e.kind === kind);
    if (found.length) return found;
    await new Promise((r) => setTimeout(r, 100));
  }
  return [];
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ClerkAuthGuard)
    .useClass(TestSessionGuard)
    .compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  base = await app.getUrl();
  prisma = app.get(PrismaService);
  email = app.get(EmailService);

  const user = (n: string) => prisma.user.create({ data: { clerkUserId: `user_test_${randomUUID()}`, email: `${n}-${randomUUID().slice(0, 6)}@bookpage.test` } });
  ownerId = (await user('owner')).id;
  otherOwnerId = (await user('other')).id;
  businessId = (await prisma.business.create({
    data: { ownerId, slug: `test-${randomUUID().slice(0, 8)}`, name: 'Dash Test', timezone: 'UTC', publishedAt: new Date(), bookingRules: { create: {} } },
  })).id;
  serviceId = (await prisma.service.create({ data: { businessId, name: 'Cut', priceType: 'fixed', priceMinor: 2500, durationMin: 30 } })).id;
  staffId = (await prisma.staff.create({ data: { businessId, name: 'Ana' } })).id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { businessId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherOwnerId] } } });
  await app.close();
});

beforeEach(() => {
  email.outbox.length = 0;
});

describe('dashboard bookings', () => {
  it('lists bookings with customer details, filtered by status and date', async () => {
    const pending = await book(48 * HOUR, 'pending');
    const confirmed = await book(50 * HOUR);

    const all = (await call('GET', `/bookings?from=${new Date().toISOString()}`)).json.bookings as OwnerBooking[];
    const ids = all.map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining([pending.id, confirmed.id]));
    const p = all.find((b) => b.id === pending.id)!;
    expect(p).toMatchObject({ status: 'pending', serviceName: 'Cut', staffName: 'Ana', note: 'Please be gentle' });
    expect(p.customer.phone).toBe('+12125550100');

    const onlyPending = (await call('GET', '/bookings?status=pending')).json.bookings as OwnerBooking[];
    expect(onlyPending.every((b) => b.status === 'pending')).toBe(true);
    expect(onlyPending.map((b) => b.id)).toContain(pending.id);

    const beforeConfirmed = (await call('GET', `/bookings?to=${confirmed.startsAt.toISOString()}&from=${new Date().toISOString()}`)).json.bookings as OwnerBooking[];
    expect(beforeConfirmed.map((b) => b.id)).not.toContain(confirmed.id);
  });

  it('summarises today, this week and what needs approval', async () => {
    const { json } = await call('GET', '/summary');
    const s = json as OwnerSummary;
    expect(s.timezone).toBe('UTC');
    expect(s.pendingCount).toBeGreaterThanOrEqual(1);
    expect(s.next).not.toBeNull();
  });

  it('approves a pending booking and emails the customer', async () => {
    const b = await book(72 * HOUR, 'pending');
    const { status, json } = await call('POST', `/bookings/${b.id}/status`, { status: 'confirmed' });
    expect(status).toBe(200);
    expect(json.status).toBe('confirmed');
    const [mail] = await sent('booking-approved');
    expect(mail!.subject).toMatch(/^Confirmed: Cut at Dash Test/);

    // A second click (or a second tab) can't approve twice.
    expect((await call('POST', `/bookings/${b.id}/status`, { status: 'confirmed' })).status).toBe(400);
  });

  it('declines a request, emails the customer and frees the time', async () => {
    const b = await book(74 * HOUR, 'pending');
    const { json } = await call('POST', `/bookings/${b.id}/status`, { status: 'cancelled' });
    expect(json).toMatchObject({ status: 'cancelled', cancelReason: 'Declined by business' });
    const [mail] = await sent('booking-declined');
    expect(mail!.subject).toMatch(/^Not available: Cut/);

    // The slot is free again for the same person.
    const again = await prisma.booking.create({
      data: { ...pick(b), status: 'confirmed', manageTokenHash: null },
    });
    expect(again.id).toBeTruthy();
  });

  it('cancels a confirmed booking with a reason the customer sees', async () => {
    const b = await book(76 * HOUR);
    await call('POST', `/bookings/${b.id}/status`, { status: 'cancelled', reason: 'Stylist is ill, sorry!' });
    const [mail] = await sent('booking-cancelled-by-business');
    expect(mail!.text).toContain('Note: Stylist is ill, sorry!');
  });

  it('only marks done or no-show once the booking has started', async () => {
    const future = await book(78 * HOUR);
    expect((await call('POST', `/bookings/${future.id}/status`, { status: 'completed' })).status).toBe(400);

    const past = await book(-5 * HOUR);
    expect((await call('POST', `/bookings/${past.id}/status`, { status: 'no_show' })).json.status).toBe('no_show');
    expect(email.outbox).toHaveLength(0); // no email for marking attendance
  });

  it("can't see or change another owner's bookings", async () => {
    const b = await book(80 * HOUR, 'pending');
    expect((await call('POST', `/bookings/${b.id}/status`, { status: 'confirmed' }, otherOwnerId)).status).toBe(404);
    expect((await call('GET', '/bookings', undefined, otherOwnerId)).status).toBe(404);
  });

  it('rejects status changes from another origin', async () => {
    const b = await book(82 * HOUR, 'pending');
    const res = await fetch(`${base}/business/bookings/${b.id}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://evil.example', 'x-test-user': ownerId },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    expect(res.status).toBe(403);
  });
});

function pick(b: Awaited<ReturnType<typeof book>>) {
  const { id: _id, createdAt: _c, updatedAt: _u, cancelledAt: _x, cancelReason: _r, confirmedAt: _f, reminderSentAt: _s, ...rest } = b;
  return rest;
}
