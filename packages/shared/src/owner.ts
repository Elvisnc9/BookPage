import { z } from 'zod';
import type { BookingStatus, PriceType } from './enums.js';

/** What the owner sees about a booking. Owner-only: includes customer contact details. */
export interface OwnerBooking {
  id: string;
  status: BookingStatus;
  source: 'page' | 'owner';
  startsAt: string;
  endsAt: string;
  serviceName: string;
  staffName: string;
  priceType: PriceType;
  priceMinor: number | null;
  currency: string;
  note: string | null;
  customer: { name: string; email: string | null; phone: string | null };
  createdAt: string;
  cancelReason: string | null;
}

export interface OwnerSummary {
  timezone: string;
  today: string;
  todayCount: number;
  weekCount: number;
  pendingCount: number;
  next: OwnerBooking | null;
}

/**
 * What an owner can do to a booking:
 *   pending   → confirmed (approve) | cancelled (decline)
 *   confirmed → cancelled | completed | no_show (the last two once it has started)
 */
export const OWNER_STATUS_CHANGES = ['confirmed', 'cancelled', 'completed', 'no_show'] as const;

export const bookingStatusChangeSchema = z.object({
  status: z.enum(OWNER_STATUS_CHANGES),
  reason: z.string().trim().max(300).optional(),
});
export type BookingStatusChange = z.infer<typeof bookingStatusChangeSchema>;

export function allowedChanges(status: BookingStatus, startsAt: Date, now = new Date()): BookingStatus[] {
  if (status === 'pending') return ['confirmed', 'cancelled'];
  if (status === 'confirmed') return startsAt <= now ? ['completed', 'no_show', 'cancelled'] : ['cancelled'];
  return [];
}
