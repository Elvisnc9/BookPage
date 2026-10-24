// What search engines and link previews read from a booking page: the title and
// description, share-preview tags (Open Graph / X), and schema.org structured data
// describing the business. Everything comes from the business's own data; nothing
// is invented (no ratings, no reviews).
import { CATEGORIES, type CategoryKey, type PublicBusiness } from '@bookpage/shared';

/** schema.org LocalBusiness subtypes for our categories; anything else is a plain LocalBusiness. */
const SCHEMA_TYPE: Partial<Record<CategoryKey, string>> = {
  hair_salon: 'HairSalon',
  barber: 'HairSalon',
  spa: 'DaySpa',
  nails_lashes: 'NailSalon',
  clinic: 'MedicalClinic',
  fitness: 'ExerciseGym',
  mechanic: 'AutoRepair',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface PageSeo {
  title: string;
  description: string;
  canonical: string;
  /** Absolute URL of the share image, when the business has a photo. */
  image: string | null;
  /** Ready to place inside <script type="application/ld+json">: `<` is escaped. */
  jsonLd: string;
}

const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** `pageUrl` is the page's own address, e.g. https://glow.bookpage.app/ */
export function seoFor(b: PublicBusiness, pageUrl: string): PageSeo {
  const origin = new URL(pageUrl).origin;
  const canonical = `${origin}/`;
  const category = b.category && b.category in CATEGORIES ? (b.category as CategoryKey) : null;
  const label = category && category !== 'other' ? CATEGORIES[category].label : null;
  const place = b.city ?? b.serviceAreas[0] ?? null;

  const title = [b.name, [label, place].filter(Boolean).join(' in ')].filter(Boolean).join(' · ') + ' · Book online';
  const description = (b.description?.trim() || `Book ${b.name} online${place ? ` in ${place}` : ''}. See services, prices and open times.`).slice(0, 300);
  const abs = (url: string) => new URL(url, origin).href;
  const images = [b.hero, b.logo, ...b.gallery].filter((x) => x !== null).map((x) => abs(x.url));
  const onPremises = (b.locationType === 'premises' || b.locationType === 'both') && !!b.addressLine1;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': (category && SCHEMA_TYPE[category]) ?? 'LocalBusiness',
    name: b.name,
    url: canonical,
    ...(b.description ? { description: b.description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(b.logo ? { logo: abs(b.logo.url) } : {}),
    ...(b.phone ? { telephone: b.phone } : {}),
    ...(onPremises
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: [b.addressLine1, b.addressLine2].filter(Boolean).join(', '),
            ...(b.city ? { addressLocality: b.city } : {}),
            ...(b.region ? { addressRegion: b.region } : {}),
            ...(b.postalCode ? { postalCode: b.postalCode } : {}),
            addressCountry: b.country,
          },
        }
      : {}),
    ...(b.serviceAreas.length ? { areaServed: b.serviceAreas.map((name) => ({ '@type': 'Place', name })) } : {}),
    ...(b.hours.length
      ? {
          openingHoursSpecification: b.hours.map((h) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: DAYS[(h.weekday + 6) % 7],
            opens: hhmm(h.opensAt),
            closes: hhmm(h.closesAt),
          })),
        }
      : {}),
  };

  const offers = b.services
    .filter((s) => s.priceType === 'fixed' && s.priceMinor !== null)
    .map((s) => ({
      '@type': 'Offer',
      price: (s.priceMinor! / 100).toFixed(2),
      priceCurrency: b.currency,
      itemOffered: { '@type': 'Service', name: s.name, ...(s.description ? { description: s.description } : {}) },
    }));
  if (offers.length) data.hasOfferCatalog = { '@type': 'OfferCatalog', name: 'Services', itemListElement: offers };

  return { title, description, canonical, image: images[0] ?? null, jsonLd: JSON.stringify(data).replace(/</g, '\\u003c') };
}
