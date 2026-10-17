import {
  type BusinessPatch,
  type CategoryKey,
  CLASSIC_FALLBACK,
  CLASSIC_THEME,
  type Currency,
  FALLBACK_TEMPLATE_SLUG,
  fromMinor,
  type HoursInput,
  mergeTheme,
  type OwnerBusiness,
  type PriceType,
  type PublicBusiness,
  type ResolvedSite,
  type ServiceInput,
  type SiteTemplate,
  type SiteTheme,
  toMinor,
  WEEKDAYS,
} from '@bookpage/shared';

/** Countries offered at launch, with the currency we default to for each. */
export const COUNTRIES: Record<string, Currency> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', IE: 'EUR', AU: 'AUD', NZ: 'NZD',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR', AT: 'EUR', FI: 'EUR',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
};

/** IANA zones per launch country, most common first. */
export const COUNTRY_ZONES: Record<string, string[]> = {
  US: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'],
  CA: ['America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax', 'America/St_Johns', 'America/Regina'],
  GB: ['Europe/London'], IE: ['Europe/Dublin'],
  AU: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth', 'Australia/Adelaide', 'Australia/Hobart', 'Australia/Darwin'],
  NZ: ['Pacific/Auckland'],
  DE: ['Europe/Berlin'], FR: ['Europe/Paris'], ES: ['Europe/Madrid', 'Atlantic/Canary'], IT: ['Europe/Rome'],
  NL: ['Europe/Amsterdam'], BE: ['Europe/Brussels'], PT: ['Europe/Lisbon', 'Atlantic/Azores'], AT: ['Europe/Vienna'],
  FI: ['Europe/Helsinki'], CH: ['Europe/Zurich'], SE: ['Europe/Stockholm'], NO: ['Europe/Oslo'], DK: ['Europe/Copenhagen'],
  PL: ['Europe/Warsaw'],
};

/** "America/New_York" → "New York". */
export const zoneLabel = (zone: string) => zone.split('/').pop()!.replace(/_/g, ' ');

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** First guess at country, currency and time zone from the browser, for the draft. */
export function detectLocale(): Pick<BusinessPatch, 'country' | 'currency' | 'timezone'> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  // The time zone says where the owner is more reliably than the browser language.
  const byZone = Object.keys(COUNTRY_ZONES).find((c) => COUNTRY_ZONES[c]!.includes(timezone));
  const byLanguage = navigator.languages
    .map((l) => l.split('-')[1]?.toUpperCase())
    .find((r): r is string => !!r && r in COUNTRIES);
  const country = byZone ?? byLanguage ?? 'US';
  return { country, currency: COUNTRIES[country] ?? 'USD', timezone };
}

// ─── About ────────────────────────────────────────────────────────────────

export interface AboutDraft {
  category: CategoryKey | null;
  name: string;
  description: string;
  locationType: OwnerBusiness['locationType'];
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
  serviceAreas: string[];
  phone: string;
  whatsapp: string;
  email: string;
  currency: string;
  timezone: string;
}

export const aboutFrom = (b: OwnerBusiness): AboutDraft => ({
  category: (b.category as CategoryKey | null) ?? null,
  name: b.name,
  description: b.description ?? '',
  locationType: b.locationType,
  addressLine1: b.addressLine1 ?? '',
  city: b.city ?? '',
  postalCode: b.postalCode ?? '',
  country: b.country,
  serviceAreas: b.serviceAreas,
  phone: b.phone ?? '',
  whatsapp: b.whatsapp ?? '',
  email: b.email ?? '',
  currency: b.currency,
  timezone: b.timezone,
});

/** Half-typed phone numbers and emails are held back so they don't block saving everything else. */
const phoneLooksDone = (p: string) => !p.trim() || p.replace(/\D/g, '').length >= 7;
const emailLooksDone = (e: string) => !e.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export const aboutTo = (d: AboutDraft): BusinessPatch => ({
  ...(d.category ? { category: d.category } : {}),
  name: d.name,
  description: d.description,
  locationType: d.locationType,
  addressLine1: d.addressLine1,
  city: d.city,
  postalCode: d.postalCode,
  country: d.country,
  serviceAreas: d.serviceAreas,
  ...(phoneLooksDone(d.phone) ? { phone: d.phone } : {}),
  ...(phoneLooksDone(d.whatsapp) ? { whatsapp: d.whatsapp } : {}),
  ...(emailLooksDone(d.email) ? { email: d.email.trim() } : {}),
  currency: d.currency as Currency,
  timezone: d.timezone,
});

export const needsAddress = (t: AboutDraft['locationType']) => t === 'premises' || t === 'both';
export const needsAreas = (t: AboutDraft['locationType']) => t === 'mobile' || t === 'both';

/**
 * List editors take an updater, so two edits in one frame (a fast tap after
 * typing) both land instead of the second overwriting the first.
 */
export type ListEdit<T> = (update: (current: T[]) => T[]) => void;

// ─── Hours (one range per day in the UI) ────────────────────────────────────

export interface DayDraft {
  weekday: number;
  open: boolean;
  opensAt: number;
  closesAt: number;
}

export const hoursFrom = (b: OwnerBusiness): DayDraft[] =>
  WEEKDAYS.map((weekday) => {
    const range = b.hours.find((h) => h.weekday === weekday);
    return range ? { weekday, open: true, opensAt: range.opensAt, closesAt: range.closesAt } : { weekday, open: false, opensAt: 540, closesAt: 1080 };
  });

export const hoursTo = (days: DayDraft[]): HoursInput =>
  days.filter((d) => d.open && d.opensAt < d.closesAt).map(({ weekday, opensAt, closesAt }) => ({ weekday, opensAt, closesAt }));

// ─── Services ─────────────────────────────────────────────────────────────

export interface ServiceDraft {
  key: string;
  id?: string | undefined;
  name: string;
  description: string;
  priceType: PriceType;
  price: string;
  durationMin: number;
  bufferMin: number;
  bookable: boolean;
}

let nextKey = 0;
export const newKey = () => `k${++nextKey}`;

export const servicesFrom = (b: OwnerBusiness): ServiceDraft[] =>
  b.services.map((s) => ({
    key: newKey(),
    id: s.id,
    name: s.name,
    description: s.description ?? '',
    priceType: s.priceType,
    price: s.priceMinor === null ? '' : fromMinor(s.priceMinor),
    durationMin: s.durationMin,
    bufferMin: s.bufferMin,
    bookable: s.bookable,
  }));

/** The row as the API wants it, or why it can't be saved yet. */
export function serviceTo(d: ServiceDraft): { input: ServiceInput } | { problem: string } {
  if (!d.name.trim()) return { problem: 'Add a name' };
  const priced = d.priceType === 'fixed' || d.priceType === 'from';
  const priceMinor = priced ? toMinor(d.price) : null;
  if (priced && (priceMinor === null || priceMinor === 0)) return { problem: 'Add a price, like 45 or 45.50' };
  return {
    input: {
      ...(d.id ? { id: d.id } : {}),
      name: d.name.trim(),
      description: d.description.trim() || null,
      priceType: d.priceType,
      priceMinor,
      durationMin: d.durationMin,
      bufferMin: d.bufferMin,
      bookable: d.priceType === 'quote' ? false : d.bookable,
    },
  };
}

// ─── Team ─────────────────────────────────────────────────────────────────

export interface StaffDraft {
  key: string;
  id?: string | undefined;
  name: string;
}

export const staffFrom = (b: OwnerBusiness): StaffDraft[] => b.staff.map((s) => ({ key: newKey(), id: s.id, name: s.name }));

/** "Glow Studio!" → "glowstudio". */
export const suggestSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40);

// ─── Design (template + theme) ─────────────────────────────────────────────

export interface DesignDraft {
  /** null: never picked, which means Classic. */
  templateId: string | null;
  theme: Partial<SiteTheme>;
}

export const designFrom = (b: OwnerBusiness): DesignDraft => ({ templateId: b.templateId, theme: b.theme });

/**
 * The template the preview draws, from the gallery list and the owner's pick.
 * Mirrors the API's resolveSite: a pick that isn't offered keeps the server's
 * resolution (Classic plus a notice), never a silent swap.
 */
export function draftSite(templates: SiteTemplate[], design: DesignDraft, saved: OwnerBusiness): ResolvedSite {
  const picked = design.templateId
    ? templates.find((t) => t.id === design.templateId)
    : templates.find((t) => t.slug === FALLBACK_TEMPLATE_SLUG);
  if (picked) {
    const { id, slug, name, version, schemaVersion, layout } = picked;
    return { template: { id, slug, name, version, schemaVersion, layout }, theme: mergeTheme(picked.defaultTheme, design.theme), notice: null };
  }
  if (design.templateId === saved.templateId) return { ...saved.site, theme: mergeTheme(saved.site.theme, design.theme) };
  return { template: CLASSIC_FALLBACK, theme: mergeTheme(CLASSIC_THEME, design.theme), notice: null };
}

/**
 * The owner's unsaved draft as the booking page's own data shape, so the preview
 * goes through buildSite and the template components exactly like the live page.
 * Half-finished services are left out, as they would be on the page.
 */
export function previewBusiness(input: {
  saved: OwnerBusiness;
  about: AboutDraft;
  days: DayDraft[];
  services: ServiceDraft[];
  staff: StaffDraft[];
  site: ResolvedSite;
}): PublicBusiness {
  const { saved, about, site } = input;
  const services = input.services.flatMap((d, i) => {
    const r = serviceTo(d);
    if (!('input' in r)) return [];
    const stored = d.id ? saved.services.find((s) => s.id === d.id) : undefined;
    return [{
      id: d.id ?? `draft-${i}`,
      name: r.input.name,
      description: r.input.description ?? null,
      priceType: r.input.priceType,
      priceMinor: r.input.priceMinor,
      durationMin: r.input.durationMin,
      bookable: r.input.bookable && r.input.priceType !== 'quote',
      image: stored?.image ?? null,
    }];
  });
  const bookableIds = services.filter((s) => s.bookable).map((s) => s.id);
  const phone = about.phone.trim();
  return {
    slug: saved.slug,
    name: about.name,
    category: about.category,
    description: about.description.trim() || null,
    locationType: about.locationType,
    addressLine1: about.addressLine1.trim() || null,
    addressLine2: null,
    city: about.city.trim() || null,
    region: null,
    postalCode: about.postalCode.trim() || null,
    country: about.country,
    serviceAreas: about.serviceAreas,
    phone: phone || null,
    whatsapp: about.whatsapp.trim() || null,
    email: about.email.trim() || null,
    logo: saved.logo,
    hero: saved.hero,
    gallery: saved.gallery,
    site,
    timezone: about.timezone,
    currency: about.currency,
    hours: hoursTo(input.days),
    services,
    // Everyone takes every bookable service until per-person services exist (the API does the same).
    staff: input.staff.filter((p) => p.name.trim()).map((p, i) => ({
      id: p.id ?? `draft-staff-${i}`,
      name: p.name.trim(),
      serviceIds: bookableIds,
      photo: (p.id && saved.staff.find((s) => s.id === p.id)?.photo) || null,
    })),
    faqs: [],
    booking: { windowDays: saved.rules.windowDays, customerFields: saved.rules.customerFields },
  };
}
