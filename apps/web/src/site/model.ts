// The one business-data contract every template renders from. Built from a
// PublicBusiness: the booking page gets one from the API, the onboarding
// preview builds one from the owner's draft (see onboarding/draft.ts), so both
// go through exactly this code.
import {
  CATEGORIES,
  type CategoryKey,
  formatDuration,
  formatMinutes,
  type LayoutConfig,
  localDate,
  type PublicBusiness,
  type ResolvedSite,
  type SiteImage,
  type SiteSection,
  type SiteTheme,
  WEEKDAY_SHORT,
} from '@bookpage/shared';
import { initials, openStatus, price } from './format';

/** live: the published page. preview: the onboarding preview, which marks placeholders. */
export type SiteMode = 'live' | 'preview';

export interface SiteService {
  id: string;
  name: string;
  description: string | null;
  price: string;
  /** "1 h 30 min"; null for quote-only services. */
  duration: string | null;
  minutes: number | null;
  bookable: boolean;
  href: string;
  image: SiteImage | null;
  initials: string;
}

export interface SitePerson {
  id: string;
  name: string;
  initials: string;
  photo: SiteImage | null;
  /** "Silk press & Braids +2" */
  does: string;
  serviceCount: number;
  /** Book with this person (their first bookable service), when there is one. */
  href: string | null;
}

export interface SiteDay {
  short: string;
  today: boolean;
  closed: boolean;
  text: string;
}

export interface SiteModel {
  mode: SiteMode;
  template: ResolvedSite['template'];
  theme: SiteTheme;
  layout: LayoutConfig;

  name: string;
  /** False in the preview before the owner has typed a name. */
  hasName: boolean;
  initials: string;
  categoryLabel: string | null;
  cta: string;
  /** What the team is called: stylists, barbers, coaches… */
  crew: string;
  tagline: string | null;
  /** "Brooklyn, NY", "Online", "Comes to you" */
  area: string | null;
  onPremises: boolean;
  street: string | null;
  address: string | null;
  mapsUrl: string | null;
  serviceAreas: string[];
  locationType: PublicBusiness['locationType'];

  phone: { label: string; href: string } | null;
  whatsapp: string | null;
  email: string | null;

  status: { open: boolean; text: string };
  days: SiteDay[];
  today: SiteDay;
  timezoneLabel: string;

  services: SiteService[];
  /** "$35": the lowest fixed or from price, for "from" lines. */
  lowestPrice: string | null;
  team: SitePerson[];
  logo: SiteImage | null;
  hero: SiteImage | null;
  gallery: SiteImage[];
  faqs: { question: string; answer: string }[];

  links: { services: string; enquire: string };
}

const CREW: Record<string, string> = {
  hair_salon: 'stylists', barber: 'barbers', spa: 'therapists', nails_lashes: 'artists', clinic: 'clinicians',
  tutor: 'tutors', fitness: 'coaches', photography: 'photographers', cleaning: 'crew', mechanic: 'mechanics',
};

export function buildSite(b: PublicBusiness, mode: SiteMode, now = new Date()): SiteModel {
  const category = b.category && b.category in CATEGORIES ? CATEGORIES[b.category as CategoryKey] : null;
  const name = b.name.trim();
  const onPremises = (b.locationType === 'premises' || b.locationType === 'both') && !!b.addressLine1;
  const address = [b.addressLine1, b.addressLine2, b.city, b.region, b.postalCode].filter(Boolean).join(', ') || null;
  const area =
    b.locationType === 'online' ? 'Online'
    : b.locationType === 'mobile' ? (b.serviceAreas.length ? `Comes to you · ${b.serviceAreas.slice(0, 2).join(', ')}` : 'Comes to you')
    : [b.city, b.region].filter(Boolean).join(', ') || null;

  const range = (h: { opensAt: number; closesAt: number }) => `${formatMinutes(h.opensAt)} – ${h.closesAt === 1440 ? 'Midnight' : formatMinutes(h.closesAt)}`;
  const todayIndex = localDate(now, b.timezone).weekday;
  const days = WEEKDAY_SHORT.map((short, i) => {
    const ranges = b.hours.filter((h) => h.weekday === i + 1);
    return { short, today: i + 1 === todayIndex, closed: ranges.length === 0, text: ranges.length ? ranges.map(range).join(', ') : 'Closed' };
  });

  const href = (s: PublicBusiness['services'][number], staffId?: string) =>
    s.bookable ? `/book?${new URLSearchParams({ service: s.id, ...(staffId ? { staff: staffId } : {}) })}` : `/enquire?service=${s.id}`;

  const services: SiteService[] = b.services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: price(s, b.currency),
    duration: s.priceType === 'quote' ? null : formatDuration(s.durationMin),
    minutes: s.priceType === 'quote' ? null : s.durationMin,
    bookable: s.bookable,
    href: href(s),
    image: s.image,
    initials: initials(s.name),
  }));
  const lowest = b.services
    .filter((s) => (s.priceType === 'fixed' || s.priceType === 'from') && s.priceMinor !== null)
    .sort((x, y) => x.priceMinor! - y.priceMinor!)[0];

  const team: SitePerson[] = b.staff.map((p) => {
    const theirs = b.services.filter((s) => p.serviceIds.includes(s.id));
    const names = theirs.map((s) => s.name);
    const first = theirs.find((s) => s.bookable);
    return {
      id: p.id,
      name: p.name,
      initials: initials(p.name),
      photo: p.photo,
      does: names.slice(0, 2).join(' & ') + (names.length > 2 ? ` +${names.length - 2}` : ''),
      serviceCount: theirs.length,
      href: first ? href(first, p.id) : null,
    };
  });

  return {
    mode,
    template: b.site.template,
    theme: b.site.theme,
    layout: b.site.template.layout,
    name: name || 'Your business',
    hasName: !!name,
    initials: initials(name || 'Your business'),
    categoryLabel: category?.label ?? null,
    cta: category?.cta ?? 'Book now',
    crew: CREW[b.category ?? ''] ?? 'team',
    tagline: b.description?.trim() || null,
    area,
    onPremises,
    street: b.addressLine1,
    address,
    mapsUrl: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${address}`)}` : null,
    serviceAreas: b.serviceAreas,
    locationType: b.locationType,
    phone: b.phone ? { label: b.phone, href: `tel:${b.phone}` } : null,
    whatsapp: b.whatsapp ? `https://wa.me/${b.whatsapp.replace(/\D/g, '')}` : null,
    email: b.email,
    status: openStatus(b, now),
    days,
    today: days[todayIndex - 1]!,
    timezoneLabel: b.timezone.split('/').pop()!.replace(/_/g, ' '),
    services,
    lowestPrice: lowest ? price({ ...lowest, priceType: 'fixed' }, b.currency) : null,
    team,
    logo: b.logo,
    hero: b.hero,
    gallery: b.gallery,
    faqs: b.faqs,
    links: { services: '/#services', enquire: '/enquire' },
  };
}

/**
 * Whether a section shows. The live page hides sections with nothing in them;
 * the preview keeps the ones the owner can still fill in, as marked placeholders.
 */
export function shows(site: SiteModel, section: SiteSection): boolean {
  if (!site.layout.sections.includes(section)) return false;
  const preview = site.mode === 'preview';
  switch (section) {
    case 'services': return site.services.length > 0 || preview;
    case 'about': return !!site.tagline || preview;
    case 'gallery': return site.layout.gallery.limit > 0 && (site.gallery.length > 0 || preview);
    case 'team': return site.team.length > 0;
    case 'hours': return site.days.some((d) => !d.closed) || preview;
    case 'contact': return true;
    case 'faq': return site.faqs.length > 0;
  }
}

/** Header links for the sections this page actually has. */
export function navFor(site: SiteModel, labels: Partial<Record<SiteSection, string>> = {}) {
  const defaults: Record<SiteSection, string> = {
    services: site.layout.labels.services ?? 'Services',
    about: site.layout.labels.about ?? 'About',
    gallery: site.layout.labels.gallery ?? 'Gallery',
    team: site.layout.labels.team ?? cap(site.crew),
    hours: 'Hours',
    contact: site.layout.labels.visit ?? (site.onPremises ? 'Visit' : 'Contact'),
    faq: site.layout.labels.faq ?? 'FAQ',
  };
  return site.layout.sections
    .filter((s) => s !== 'hours' && shows(site, s))
    .map((s) => ({ href: `#${s}`, label: labels[s] ?? defaults[s] }));
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
