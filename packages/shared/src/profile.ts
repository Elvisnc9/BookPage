import type { CustomerFields, ServiceInput } from './business.js';
import type { LOCATION_TYPES } from './enums.js';

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
  email: string | null;
  timezone: string;
  currency: string;
  template: string;
  onboardingStep: number;
  publishedAt: string | null;
  hours: { weekday: number; opensAt: number; closesAt: number }[];
  services: (ServiceInput & { id: string })[];
  staff: { id: string; name: string }[];
  rules: { minNoticeMin: number; windowDays: number; autoConfirm: boolean; customerFields: CustomerFields };
}

export interface PublishIssue {
  step: 1 | 2 | 3 | 5;
  message: string;
}

/** Everything that must be true before a page goes live. Shared so the UI shows the same list the API enforces. */
export function publishIssues(b: Pick<OwnerBusiness, 'name' | 'category' | 'locationType' | 'addressLine1' | 'city' | 'serviceAreas' | 'phone' | 'hours' | 'services' | 'staff'>): PublishIssue[] {
  const issues: PublishIssue[] = [];
  const needsAddress = b.locationType === 'premises' || b.locationType === 'both';
  const needsAreas = b.locationType === 'mobile' || b.locationType === 'both';

  if (!b.name.trim()) issues.push({ step: 1, message: 'Add your business name' });
  if (!b.category) issues.push({ step: 1, message: 'Pick a category' });
  if (!b.phone) issues.push({ step: 1, message: 'Add a phone number' });
  if (needsAddress && (!b.addressLine1 || !b.city)) issues.push({ step: 1, message: 'Add your street address and city' });
  if (needsAreas && b.serviceAreas.length === 0) issues.push({ step: 1, message: 'Add the areas you travel to' });
  if (b.hours.length === 0) issues.push({ step: 1, message: 'Open at least one day' });
  if (b.services.length === 0) issues.push({ step: 2, message: 'Add at least one service' });
  if (b.staff.length === 0) issues.push({ step: 3, message: 'Keep at least one person on the team' });
  return issues;
}
