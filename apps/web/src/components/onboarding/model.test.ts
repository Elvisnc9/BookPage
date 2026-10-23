import type { OwnerBusiness, SiteTemplate } from '@bookpage/shared';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_CATALOGUE, toRow } from '../../../../api/prisma/templates';
import { buildSite } from '../../site/model';
import { aboutFrom, designFrom, draftSite, hoursFrom, previewBusiness, servicesFrom, staffFrom } from './model';

const templates: SiteTemplate[] = TEMPLATE_CATALOGUE.map((t, i) => {
  const { layoutConfiguration, ...row } = toRow(t, i);
  return { ...row, layout: t.layout, defaultTheme: t.defaultTheme, thumbnailUrl: null, previewImageUrl: null } as SiteTemplate;
});
const bySlug = (slug: string) => templates.find((t) => t.slug === slug)!;
const img = (id: string) => ({ id, url: `/media/${id}`, width: 10, height: 10 });

export function owner(patch: Partial<OwnerBusiness> = {}): OwnerBusiness {
  const classic = bySlug('classic');
  return {
    id: 'b1', slug: 'draft-1234abcd', name: 'Kantine Rae', category: 'other', description: 'Lunch by the canal', locationType: 'premises',
    addressLine1: '1 Canal Street', addressLine2: null, city: 'Berlin', region: null, postalCode: null, country: 'DE', serviceAreas: [],
    phone: '+49301234567', whatsapp: null, email: null, timezone: 'Europe/Berlin', currency: 'EUR',
    plan: 'free', templateId: classic.id, theme: {},
    site: { template: { id: classic.id, slug: 'classic', name: 'Classic', version: 1, schemaVersion: 1, layout: classic.layout }, theme: classic.defaultTheme, notice: null },
    logo: null, hero: img('hero'), gallery: [], onboardingStep: 2, publishedAt: null, updatedAt: '2030-01-01T00:00:00.000Z',
    hours: [{ weekday: 1, opensAt: 540, closesAt: 1080 }],
    services: [{ id: 's1', name: 'Tasting menu', description: null, priceType: 'fixed', priceMinor: 6500, durationMin: 120, bufferMin: 0, bookable: true, depositMinor: null, image: img('s1') }],
    staff: [{ id: 'p1', name: 'Rae', photo: img('p1') }],
    rules: { minNoticeMin: 60, windowDays: 60, autoConfirm: true, customerFields: { phone: 'required', note: 'optional' }, depositUrl: null, depositHoldMin: 120, depositRefundHours: 24 },
    ...patch,
  };
}

function draft(b: OwnerBusiness) {
  return { saved: b, about: aboutFrom(b), days: hoursFrom(b), services: servicesFrom(b), staff: staffFrom(b) };
}

describe('the preview draft', () => {
  it('shows unsaved edits through the same model as the live page', () => {
    const b = owner();
    const d = draft(b);
    d.about.name = 'Kantine Rae & Söhne';
    d.services.push({ key: 'new', name: 'Wine flight', description: 'Three glasses', priceType: 'fixed', price: '18', durationMin: 45, bufferMin: 0, bookable: true, deposit: '' });
    const site = buildSite(previewBusiness({ ...d, site: draftSite(templates, designFrom(b), b) }), 'preview');
    expect(site.name).toBe('Kantine Rae & Söhne');
    expect(site.services.map((s) => [s.name, s.price])).toEqual([['Tasting menu', '€65'], ['Wine flight', '€18']]);
    // Saved photos follow their service and person by id.
    expect(site.services[0]!.image?.url).toBe('/media/s1');
    expect(site.team[0]!.photo?.url).toBe('/media/p1');
    expect(site.hero?.url).toBe('/media/hero');
  });

  it('leaves half-finished services out, as the live page would', () => {
    const b = owner();
    const d = draft(b);
    d.services.push({ key: 'x', name: 'Mystery', description: '', priceType: 'fixed', price: '', durationMin: 30, bufferMin: 0, bookable: true, deposit: '' });
    const pub = previewBusiness({ ...d, site: draftSite(templates, designFrom(b), b) });
    expect(pub.services.map((s) => s.name)).toEqual(['Tasting menu']);
  });

  it('switching template keeps every piece of business data', () => {
    const b = owner();
    const d = draft(b);
    const classic = previewBusiness({ ...d, site: draftSite(templates, { templateId: bySlug('classic').id, theme: {} }, b) });
    const noir = previewBusiness({ ...d, site: draftSite(templates, { templateId: bySlug('journal').id, theme: {} }, b) });
    expect(noir.site.template.slug).toBe('journal');
    const { site: _a, ...restClassic } = classic;
    const { site: _b, ...restNoir } = noir;
    expect(restNoir).toEqual(restClassic);
  });
});

describe('draftSite', () => {
  it('never draws a Pro template the plan does not cover, even if the draft points at it', () => {
    const bloom = bySlug('bloom');
    expect(bloom.isPremium).toBe(true);
    const free = owner({ plan: 'free', templateId: bloom.id, site: { ...owner().site, notice: { code: 'locked', requested: 'bloom' } } });
    expect(draftSite(templates, { templateId: bloom.id, theme: {} }, free)).toMatchObject({ template: { slug: 'classic' }, notice: { code: 'locked' } });
    expect(draftSite(templates, { templateId: bloom.id, theme: {} }, owner({ plan: 'pro' })).template.slug).toBe('bloom');
  });

  it('draws the picked template with the owner theme on top', () => {
    const site = draftSite(templates, { templateId: bySlug('pulse').id, theme: { accent: '#123456' } }, owner());
    expect(site.template.slug).toBe('pulse');
    expect(site.theme).toEqual({ accent: '#123456', font: 'condensed' });
  });

  it('uses Classic when nothing was picked', () => {
    expect(draftSite(templates, { templateId: null, theme: {} }, owner({ templateId: null })).template.slug).toBe('classic');
  });

  it('keeps the server\'s fallback and notice when the saved pick is no longer offered, rather than switching silently', () => {
    const retired = '01929b00-0000-7000-8000-00000000ffff';
    const saved = owner({ templateId: retired, site: { ...owner().site, notice: { code: 'inactive', requested: 'gone' } } });
    const site = draftSite(templates, { templateId: retired, theme: {} }, saved);
    expect(site.template.slug).toBe('classic');
    expect(site.notice).toEqual({ code: 'inactive', requested: 'gone' });
  });
});
