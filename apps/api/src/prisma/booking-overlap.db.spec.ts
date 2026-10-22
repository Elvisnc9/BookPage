// Runs against the real database (pnpm test:db). Proves the bookings_no_overlap
// constraint, not app code, is what stops double bookings.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BookingStatus } from '../generated/prisma/client';
import { isSlotTaken } from './errors';
import { PrismaService } from './prisma.service';

const prisma = new PrismaService();
const at = (iso: string) => new Date(`2030-01-15T${iso}:00Z`);

let businessId: string;
let serviceId: string;
let staffA: string;
let staffB: string;
let customerId: string;

function book(staffId: string, start: string, end: string, blockedUntil = end, status: BookingStatus = 'confirmed') {
  return prisma.booking.create({
    data: {
      businessId, serviceId, staffId, customerId, status,
      startsAt: at(start), endsAt: at(end), blockedUntil: at(blockedUntil),
      serviceName: 'Test cut', durationMin: 60, priceType: 'fixed', priceMinor: 1000, currency: 'USD',
    },
  });
}

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { clerkUserId: `user_test_${randomUUID()}`, email: `test-${randomUUID()}@bookpage.test` },
  });
  const business = await prisma.business.create({
    data: { ownerId: owner.id, slug: `test-${randomUUID().slice(0, 8)}`, name: 'Overlap test' },
  });
  businessId = business.id;
  serviceId = (await prisma.service.create({
    data: { businessId, name: 'Test cut', priceType: 'fixed', priceMinor: 1000, durationMin: 60 },
  })).id;
  staffA = (await prisma.staff.create({ data: { businessId, name: 'A' } })).id;
  staffB = (await prisma.staff.create({ data: { businessId, name: 'B' } })).id;
  customerId = (await prisma.customer.create({ data: { businessId, name: 'Test customer' } })).id;

  await book(staffA, '10:00', '11:00', '11:15'); // 15 min buffer
});

afterAll(async () => {
  if (businessId) {
    const { ownerId } = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    await prisma.booking.deleteMany({ where: { businessId } });
    await prisma.user.delete({ where: { id: ownerId } }); // cascades to the business
  }
  await prisma.$disconnect();
});

describe('bookings_no_overlap', () => {
  it('rejects an overlapping booking for the same staff member', async () => {
    const error = await book(staffA, '10:30', '11:30').catch((e: unknown) => e);
    expect(isSlotTaken(error)).toBe(true);
  });

  it('counts the buffer as taken time', async () => {
    const error = await book(staffA, '11:05', '12:05').catch((e: unknown) => e);
    expect(isSlotTaken(error)).toBe(true);
  });

  it('allows a booking that starts exactly when the buffer ends', async () => {
    await expect(book(staffA, '11:15', '12:15')).resolves.toBeTruthy();
  });

  it('allows the same time for a different staff member', async () => {
    await expect(book(staffB, '10:00', '11:00')).resolves.toBeTruthy();
  });

  it('ignores cancelled bookings', async () => {
    await expect(book(staffA, '10:00', '11:00', '11:00', 'cancelled')).resolves.toBeTruthy();
  });

  it('lets exactly one of two simultaneous requests win', async () => {
    const results = await Promise.allSettled([
      book(staffB, '14:00', '15:00'),
      book(staffB, '14:30', '15:30'),
    ]);
    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(isSlotTaken(lost[0]!.reason)).toBe(true);
  });

  it('rejects a booking that ends before it starts', async () => {
    await expect(book(staffB, '17:00', '16:00')).rejects.toThrow(/bookings_times_ordered/);
  });
});
