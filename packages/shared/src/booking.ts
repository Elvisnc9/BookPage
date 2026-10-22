import { z } from 'zod';

/** Request bodies for the public booking page. Customers never sign in. */

const customer = z.object({
  name: z.string().trim().min(1, 'Add your name').max(80),
  email: z.email('Enter a valid email').max(120),
  phone: z.string().trim().max(30).optional(),
});

export const bookingRequestSchema = z.object({
  serviceId: z.uuid(),
  /** Omitted = anyone free. */
  staffId: z.uuid().optional(),
  startsAt: z.iso.datetime({ offset: true }),
  customer: customer.extend({ note: z.string().trim().max(500).optional() }),
  remindersConsent: z.boolean().default(false),
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export const enquiryRequestSchema = z.object({
  serviceId: z.uuid().optional(),
  message: z.string().trim().min(1, 'Tell them what you need').max(1000),
  preferredDate: z.iso.date().optional(),
  customer,
});
export type EnquiryRequest = z.infer<typeof enquiryRequestSchema>;

export const cancelRequestSchema = z.object({ token: z.string().min(20).max(100) });

/** Moves a booking to another free time. Omitting staffId keeps the same person when they're free, else anyone. */
export const rescheduleRequestSchema = z.object({
  token: z.string().min(20).max(100),
  startsAt: z.iso.datetime({ offset: true }),
  staffId: z.uuid().optional(),
});
export type RescheduleRequest = z.infer<typeof rescheduleRequestSchema>;
