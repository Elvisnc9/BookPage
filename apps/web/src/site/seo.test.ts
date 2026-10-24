import type { PublicBusiness } from '@bookpage/shared';
import { describe, expect, it } from 'vitest';
import { seoFor } from './seo';

const business = (patch: Partial<PublicBusiness> = {}): PublicBusiness => ({
  slug: 'glow', name: 'Glow Studio', category: 'hair_salon', description: null,
  locationType: 'premises', addressLine1: '12 Bedford Ave', addressLine2: null, city: 'Brooklyn', region: 'NY', postalCode: '11211', country: 'US',
  serviceAreas: [], phone: '+17185550100', whatsapp: null, email: 'hi@glow.example',
  logo: null, hero: { id: 'h', url: '/media/h', width: 1600, height: 900 }, gallery: [], showBadge: true,
  site: {} as PublicBusiness['site'], timezone: 'America/New_York', currency: 'USD',
  hours: [{ weekday: 1, opensAt: 540, closesAt: 1080 }, { weekday: 7, opensAt: 600, closesAt: 960 }],
  services: [
    { id: 's1', name: 'Silk press', description: 'Wash, blow-dry, press', priceType: 'fixed', priceMinor: 8500, durationMin: 90, bookable: true, depositMinor: null, image: null },
    { id: 's2', name: 'Bridal', description: null, priceType: 'quote', priceMinor: null, durationMin: 180, bookable: false, depositMinor: null, image: null },
  ],
  staff: [], faqs: [],
  booking: { windowDays: 60, customerFields: { phone: 'optional', note: 'optional' }, deposits: null },
  ...patch,
});

describe('search and share details', () => {
  it('describes the business for search engines from its own data', () => {
    const seo = seoFor(business(), 'https://glow.bookpage.app/site/glow?x=1');
    expect(seo.title).toBe('Glow Studio · Salon in Brooklyn · Book online');
    expect(seo.description).toBe('Book Glow Studio online in Brooklyn. See services, prices and open times.');
    expect(seo.canonical).toBe('https://glow.bookpage.app/');
    expect(seo.image).toBe('https://glow.bookpage.app/media/h');

    const data = JSON.parse(seo.jsonLd);
    expect(data).toMatchObject({
      '@context': 'https://schema.org', '@type': 'HairSalon', name: 'Glow Studio', url: 'https://glow.bookpage.app/', telephone: '+17185550100',
      address: { '@type': 'PostalAddress', streetAddress: '12 Bedford Ave', addressLocality: 'Brooklyn', addressRegion: 'NY', postalCode: '11211', addressCountry: 'US' },
      openingHoursSpecification: [
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '09:00', closes: '18:00' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '10:00', closes: '16:00' },
      ],
    });
    // Only fixed prices become offers; quotes have no price to state.
    expect(data.hasOfferCatalog.itemListElement).toEqual([
      { '@type': 'Offer', price: '85.00', priceCurrency: 'USD', itemOffered: { '@type': 'Service', name: 'Silk press', description: 'Wash, blow-dry, press' } },
    ]);
    // Never invented: no ratings, no email harvesting.
    expect(seo.jsonLd).not.toMatch(/aggregateRating|review|hi@glow/);
  });

  it('uses the owner description, a plain type for other categories, and service areas for mobile businesses', () => {
    const seo = seoFor(business({ category: 'tutor', description: 'Maths and physics, GCSE to A level.', locationType: 'mobile', addressLine1: null, city: null, serviceAreas: ['Camden', 'Islington'], hero: null, hours: [], services: [] }), 'http://glow.localhost:4321/');
    expect(seo.description).toBe('Maths and physics, GCSE to A level.');
    expect(seo.title).toBe('Glow Studio · Tutor in Camden · Book online');
    expect(seo.image).toBeNull();
    const data = JSON.parse(seo.jsonLd);
    expect(data['@type']).toBe('LocalBusiness');
    expect(data.address).toBeUndefined();
    expect(data.areaServed).toEqual([{ '@type': 'Place', name: 'Camden' }, { '@type': 'Place', name: 'Islington' }]);
    expect(data.openingHoursSpecification).toBeUndefined();
    expect(data.hasOfferCatalog).toBeUndefined();
  });

  it('cannot be broken out of its script tag', () => {
    const seo = seoFor(business({ name: 'Glow</script><script>alert(1)</script>' }), 'https://glow.bookpage.app/');
    expect(seo.jsonLd).not.toContain('<');
    expect(JSON.parse(seo.jsonLd).name).toBe('Glow</script><script>alert(1)</script>');
  });
});
