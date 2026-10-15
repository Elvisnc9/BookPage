import { z } from 'zod';
import { CATEGORY_KEYS } from './categories.js';
import { LOCATION_TYPES, PRICE_TYPES } from './enums.js';
import { CURRENCIES } from './money.js';
import { isValidSlug } from './slug.js';

/**
 * Request bodies for the owner's business endpoints. Onboarding autosaves
 * partial data, so profile and rules are patches; completeness is only
 * enforced at publish (see publishIssues).
 */

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).nullable().optional();

export const businessPatchSchema = z
  .object({
    category: z.enum(CATEGORY_KEYS),
    name: text(80),
    description: optionalText(160),
    locationType: z.enum(LOCATION_TYPES),
    addressLine1: optionalText(120),
    addressLine2: optionalText(120),
    city: optionalText(80),
    region: optionalText(80),
    postalCode: optionalText(20),
    country: z.string().regex(/^[A-Z]{2}$/),
    serviceAreas: z.array(text(60).min(1)).max(20),
    /** Free-form as typed; the API normalises it to E.164 using `country`. */
    phone: optionalText(30),
    email: z.union([z.email().max(120), z.literal('')]).nullable().optional(),
    timezone: z.string().min(1).max(64),
    currency: z.enum(CURRENCIES),
    template: z.enum(['classic']),
    onboardingStep: z.number().int().min(0).max(5),
  })
  .partial()
  .strict();
export type BusinessPatch = z.infer<typeof businessPatchSchema>;

const minutesOfDay = z.number().int().min(0).max(1440);

export const hoursSchema = z
  .array(
    z
      .object({ weekday: z.number().int().min(1).max(7), opensAt: minutesOfDay, closesAt: minutesOfDay })
      .refine((r) => r.opensAt < r.closesAt, 'Closing time must be after opening time'),
  )
  .max(21);
export type HoursInput = z.infer<typeof hoursSchema>;

export const serviceSchema = z
  .object({
    id: z.uuid().optional(),
    name: text(80).min(1, 'Give the service a name'),
    description: optionalText(300),
    priceType: z.enum(PRICE_TYPES),
    priceMinor: z.number().int().min(0).max(100_000_00).nullable(),
    durationMin: z.number().int().min(5).max(1440),
    bufferMin: z.number().int().min(0).max(240).default(0),
    bookable: z.boolean(),
  })
  .refine((s) => (s.priceType === 'fixed' || s.priceType === 'from') === (s.priceMinor !== null), {
    message: 'Fixed and "from" prices need an amount; quote and free don\'t',
    path: ['priceMinor'],
  })
  .refine((s) => !(s.priceType === 'quote' && s.bookable), {
    message: 'Quote-only services send an enquiry, so they can\'t be booked directly',
    path: ['bookable'],
  });
export const servicesSchema = z.array(serviceSchema).max(50);
export type ServiceInput = z.infer<typeof serviceSchema>;

export const staffSchema = z
  .array(z.object({ id: z.uuid().optional(), name: text(60).min(1, 'Add a name') }))
  .min(1, 'Keep at least one person')
  .max(20);
export type StaffInput = z.infer<typeof staffSchema>;

export const FIELD_MODES = ['required', 'optional', 'off'] as const;
export const customerFieldsSchema = z.object({
  /** Email is always required: confirmations and reminders go there. */
  phone: z.enum(FIELD_MODES),
  note: z.enum(['optional', 'off']),
});
export type CustomerFields = z.infer<typeof customerFieldsSchema>;

export const rulesPatchSchema = z
  .object({
    minNoticeMin: z.number().int().min(0).max(7 * 24 * 60),
    windowDays: z.number().int().min(1).max(365),
    autoConfirm: z.boolean(),
    customerFields: customerFieldsSchema,
  })
  .partial()
  .strict();
export type RulesPatch = z.infer<typeof rulesPatchSchema>;

export const publishSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((s) => isValidSlug(s) && !s.startsWith('draft-'), 'Use 3–40 letters, numbers or single hyphens'),
});
