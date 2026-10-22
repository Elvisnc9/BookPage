// @vitest-environment happy-dom
import { type PublicBusiness, type ResolvedSite, TEMPLATE_SCHEMA_VERSION } from '@bookpage/shared';
import { render as mount } from 'preact';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_CATALOGUE } from '../../../api/prisma/templates';
import { buildSite, type SiteMode } from './model';
import { REGISTRY, rendererFor } from './registry';
import { Site } from './Site';

const NOW = new Date('2030-01-08T15:00:00Z'); // a Tuesday afternoon

function siteFor(slug: string): ResolvedSite {
  const t = TEMPLATE_CATALOGUE.find((x) => x.slug === slug)!;
  return { template: { id: t.id, slug, name: t.name, version: 1, schemaVersion: TEMPLATE_SCHEMA_VERSION, layout: t.layout }, theme: t.defaultTheme, notice: null };
}

const img = (id: string) => ({ id, url: `/media/${id}`, width: 1200, height: 800 });

/** Everything filled in: the live page and the preview should then be identical. */
function full(slug: string): PublicBusiness {
  return {
    slug: 'kantine', name: 'Kantine Rae', category: 'hair_salon', description: 'Lunch and dinner by the canal.',
    locationType: 'premises', addressLine1: '1 Canal Street', addressLine2: null, city: 'Berlin', region: null, postalCode: '10999', country: 'DE',
    serviceAreas: [], phone: '+49301234567', whatsapp: '+49301234567', email: 'hi@kantine.example',
    logo: img('logo'), hero: img('hero'), gallery: [img('g1'), img('g2'), img('g3'), img('g4'), img('g5'), img('g6')],
    site: siteFor(slug), timezone: 'Europe/Berlin', currency: 'EUR',
    hours: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, opensAt: 540, closesAt: 1320 })),
    services: [
      { id: 's1', name: 'Tasting menu', description: 'Seven courses', priceType: 'fixed', priceMinor: 6500, durationMin: 120, bookable: true, depositMinor: null, image: img('s1') },
      { id: 's2', name: 'Private room', description: 'Up to twelve', priceType: 'quote', priceMinor: null, durationMin: 180, bookable: false, depositMinor: null, image: img('s2') },
    ],
    staff: [{ id: 'p1', name: 'Rae Okafor', serviceIds: ['s1'], photo: img('p1') }],
    faqs: [{ question: 'Is there parking?', answer: 'On the street.' }],
    booking: { windowDays: 60, customerFields: { phone: 'optional', note: 'optional' }, deposits: null },
  };
}

/** The realistic worst case: long words, emoji, nothing optional filled in, closed all week. */
function worst(slug: string): PublicBusiness {
  return {
    ...full(slug),
    name: 'Wiśniewska-Kowalczyk Beauty & Brow Atelier Amsterdam-Noord 🌸',
    description: null, logo: null, hero: null, gallery: [], phone: null, whatsapp: null, email: null, addressLine1: null, city: null, postalCode: null,
    locationType: 'mobile', serviceAreas: ['Bartholomew-Fitzgerald-Northwind-Industries-Holdings-Estate'],
    hours: [],
    services: [{ id: 's1', name: 'Brow lamination with tint, shape and a very long description-like name', description: null, priceType: 'free', priceMinor: null, durationMin: 15, bookable: true, depositMinor: null, image: null }],
    staff: [{ id: 'p1', name: 'Jo', serviceIds: ['s1'], photo: null }],
    faqs: [],
  };
}

/** The markup a template produces (rendered by Preact, as on the server and in the preview). */
function html(b: PublicBusiness, mode: SiteMode): string {
  const root = document.createElement('div');
  mount(<Site site={buildSite(b, mode, NOW)} />, root);
  const out = root.innerHTML;
  mount(null, root);
  return out;
}
const slugs = TEMPLATE_CATALOGUE.map((t) => t.slug);

describe('template registry', () => {
  it('has an implementation for every template in the catalogue, and nothing else', () => {
    expect(Object.keys(REGISTRY).sort()).toEqual([...slugs].sort());
    for (const slug of slugs) expect(REGISTRY[slug]!.schemaVersions).toContain(TEMPLATE_SCHEMA_VERSION);
  });

  it('falls back to Classic, with a notice, for a slug or schema version it does not know', () => {
    const missing = rendererFor({ ...siteFor('noir').template, slug: 'hologram' });
    expect(missing).toMatchObject({ slug: 'classic', notice: { code: 'missing', requested: 'hologram' } });
    const future = rendererFor({ ...siteFor('noir').template, schemaVersion: 99 });
    expect(future).toMatchObject({ slug: 'classic', notice: { code: 'unsupported', requested: 'noir' } });
    expect(rendererFor(siteFor('noir').template)).toMatchObject({ slug: 'noir', notice: null });
    // Prototype keys are not templates.
    expect(rendererFor({ ...siteFor('noir').template, slug: 'constructor' }).slug).toBe('classic');
  });

  it('renders an unknown template as Classic instead of failing the page', () => {
    const b = full('noir');
    const out = html({ ...b, site: { ...b.site, template: { ...b.site.template, slug: 'hologram' } } }, 'live');
    expect(out).toContain('data-template="classic"');
    expect(out).toContain('class="bk"');
  });
});

describe.each(slugs)('template %s', (slug) => {
  it('renders the business data, the same way in the preview as on the live page', () => {
    const live = html(full(slug), 'live');
    const preview = html(full(slug), 'preview');
    expect(live).toContain(`data-template="${slug}"`);
    expect(live).toContain('Kantine Rae');
    expect(live).toContain('Tasting menu');
    // One implementation: with nothing missing, the preview is the live page.
    expect(preview.replace('data-mode="preview"', 'data-mode="live"')).toBe(live);
  });

  it('survives worst-case data with no broken values', () => {
    for (const mode of ['live', 'preview'] as const) {
      const out = html(worst(slug), mode);
      expect(out).toContain('Wiśniewska-Kowalczyk');
      for (const bad of ['undefined', 'NaN', '[object Object]', 'src=""', 'null']) expect(out).not.toContain(bad);
    }
  });

  it('marks placeholders in the preview and never on the live page', () => {
    expect(html(worst(slug), 'live')).not.toContain('s-ph-tag');
    expect(html(worst(slug), 'live')).not.toContain('s-hint');
    const preview = html({ ...worst(slug), hero: null }, 'preview');
    expect(preview).toMatch(/s-ph-tag|s-hint/);
  });

  it('uses the owner\'s colour and font without changing the layout', () => {
    const b = full(slug);
    const themed = html({ ...b, site: { ...b.site, theme: { accent: '#2F55D4', font: 'mono' } } }, 'live');
    expect(themed).toMatch(/--accent: ?#2F55D4/);
    expect(themed).toContain('data-font="mono"');
    const strip = (s: string) => s.replace(/style="[^"]*"/, '').replace(/data-font="[^"]*"/, '');
    expect(strip(themed)).toBe(strip(html(b, 'live')));
  });
});

describe('the gallery', () => {
  it('offers compositions that genuinely differ', () => {
    const pages = slugs.map((slug) => html(full(slug), 'live').replace(/data-template="[^"]+"|t-[a-z]+/g, ''));
    expect(new Set(pages).size).toBe(slugs.length);
  });
});
