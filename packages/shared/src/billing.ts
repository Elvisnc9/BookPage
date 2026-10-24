// Pro billing: what Pro costs, what it includes, and when a business counts as Pro.
// Provider-neutral: the payment provider (a merchant of record) is plugged in on the
// API side; until one is connected, development uses a test provider and the live
// site shows Pro as opening soon.
import { z } from 'zod';
import type { Plan } from './site.js';

/** Pro is billed yearly only; the free plan is the free trial. */
export const PRO_PRICE = { amountMinor: 24_900, currency: 'USD', interval: 'year' } as const;

/** One standard domain per year is included in Pro, up to this registration price. */
export const INCLUDED_DOMAIN_MAX_MINOR = 1_500;

/** After a renewal fails or a cancelled year ends, Pro features stay on this long. */
export const PRO_GRACE_DAYS = 14;

export const BILLING_STATUSES = ['none', 'active', 'canceling', 'past_due'] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export const DOMAIN_STATUSES = ['none', 'pending', 'active', 'failed'] as const;
export type DomainStatus = (typeof DOMAIN_STATUSES)[number];

export const DOMAIN_MODES = ['register', 'connect'] as const;
export type DomainMode = (typeof DOMAIN_MODES)[number];

/** What Pro includes today. Only features that exist; shown on the pricing and billing pages. */
export const PRO_FEATURES = [
  'Your own domain, included for the year (like yourname.com)',
  'Pro templates: Noir, Hearth, Atelier and Bloom',
  'No "Made with BookPage" badge on your page',
  'Priority support',
] as const;

/** Coming to Pro; listed separately so nothing is promised as available before it is. */
export const PRO_COMING = ['Text and WhatsApp reminders', 'Google Calendar sync', 'AI search visibility reports'] as const;

/**
 * The plan a business actually gets now: Pro stays on until its paid year ends plus
 * the grace period, whatever happened to the subscription in between.
 */
export function effectivePlan(b: { plan: Plan; planRenewsAt: Date | string | null }, now = new Date()): Plan {
  if (b.plan !== 'pro') return 'free';
  if (!b.planRenewsAt) return 'pro'; // set by hand (no billing yet)
  const end = new Date(b.planRenewsAt).getTime() + PRO_GRACE_DAYS * 86_400_000;
  return now.getTime() <= end ? 'pro' : 'free';
}

/** "glowstudio.com", "glow-studio.co.uk": a registrable name, lower-case, no scheme or path. */
export const domainNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(/^(?=.{4,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,24}$/, 'Use a domain like yourname.com')
  .refine((d) => !d.split('.').some((label) => label.startsWith('-') || label.endsWith('-')), 'Use a domain like yourname.com');

export const checkoutRequestSchema = z
  .object({
    domain: z.object({ name: domainNameSchema, mode: z.enum(DOMAIN_MODES) }).strict().nullable(),
  })
  .strict();
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export interface DomainOption {
  name: string;
  available: boolean;
  /** Registration price for the first year, in minor units (USD). */
  priceMinor: number | null;
  /** Covered by Pro (a standard name up to INCLUDED_DOMAIN_MAX_MINOR). */
  included: boolean;
}

/** Everything the billing page shows. */
export interface BillingView {
  plan: Plan;
  /** What applies right now (Pro until the paid year plus grace ends). */
  effectivePlan: Plan;
  status: BillingStatus;
  /** When the paid year ends (ISO), or null. */
  renewsAt: string | null;
  domain: { name: string; mode: DomainMode; status: DomainStatus } | null;
  price: typeof PRO_PRICE;
  /** A payment provider is connected (or the development test provider). */
  checkoutAvailable: boolean;
  /** The development test provider: nothing is charged and no domain is really registered. */
  testMode: boolean;
}
