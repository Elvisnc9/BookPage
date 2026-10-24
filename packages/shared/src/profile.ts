import type { CustomerFields, ServiceInput } from './business.js';
import type { LOCATION_TYPES } from './enums.js';
import type { SiteImage } from './media.js';
import type { Plan, ResolvedSite, SiteTheme } from './site.js';

// Kept apart from business.ts so the owner app can use these without bundling zod.

/** What the owner app holds while editing: the business as the API returns it. */
export interface OwnerBusiness {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  locationType: (typeof LOCATION_TYPES)[number];
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  serviceAreas: string[];
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  /** What applies now (Pro until the paid year plus grace ends); Pro unlocks premium templates. */
  plan: Plan;
  /** The template the owner picked (null: never picked, so Classic). */
  templateId: string | null;
  /** The owner's colour/font choices only; `site.theme` is the merged result. */
  theme: Partial<SiteTheme>;
  /** What the page actually renders with, including a notice if the pick can't be used. */
  site: ResolvedSite;
  logo: SiteImage | null;
  hero: SiteImage | null;
  gallery: SiteImage[];
  onboardingStep: number;
  publishedAt: string | null;
  /** Lets the owner app notice edits made in another tab. */
  updatedAt: string;
  hours: { weekday: number; opensAt: number; closesAt: number }[];
  services: (ServiceInput & { id: string; image: SiteImage | null })[];
  staff: { id: string; name: string; photo: SiteImage | null }[];
  rules: {
    minNoticeMin: number;
    windowDays: number;
    autoConfirm: boolean;
    customerFields: CustomerFields;
    /** The owner's own payment link for deposits; null = no deposits. */
    depositUrl: string | null;
    depositHoldMin: number;
    depositRefundHours: number;
  };
}

/** Onboarding steps, in order. `onboardingStep` counts how many are done. */
export const ONBOARDING_STEPS = ['Template', 'About', 'Services', 'Booking', 'Publish'] as const;

export interface PublishIssue {
  /** 1-based index into ONBOARDING_STEPS: where the owner fixes it. */
  step: 1 | 2 | 3 | 4 | 5;
  message: string;
}

/** Everything that must be true before a page goes live. Shared so the UI shows the same list the API enforces. */
export function publishIssues(
  b: Pick<OwnerBusiness, 'name' | 'category' | 'locationType' | 'addressLine1' | 'city' | 'serviceAreas' | 'phone' | 'hours' | 'services' | 'staff'> & {
    rules?: Pick<OwnerBusiness['rules'], 'depositUrl'>;
  },
): PublishIssue[] {
  const issues: PublishIssue[] = [];
  const needsAddress = b.locationType === 'premises' || b.locationType === 'both';
  const needsAreas = b.locationType === 'mobile' || b.locationType === 'both';

  if (!b.name.trim()) issues.push({ step: 2, message: 'Add your business name' });
  if (!b.category) issues.push({ step: 2, message: 'Pick a category' });
  if (!b.phone) issues.push({ step: 2, message: 'Add a phone number' });
  if (needsAddress && (!b.addressLine1 || !b.city)) issues.push({ step: 2, message: 'Add your street address and city' });
  if (needsAreas && b.serviceAreas.length === 0) issues.push({ step: 2, message: 'Add the areas you travel to' });
  if (b.services.length === 0) issues.push({ step: 3, message: 'Add at least one service' });
  if (b.hours.length === 0) issues.push({ step: 4, message: 'Open at least one day' });
  if (b.staff.length === 0) issues.push({ step: 4, message: 'Keep at least one person on the team' });
  if (b.rules && !b.rules.depositUrl && b.services.some((s) => s.depositMinor)) {
    issues.push({ step: 4, message: 'Add your payment link so customers can pay deposits' });
  }
  return issues;
}
