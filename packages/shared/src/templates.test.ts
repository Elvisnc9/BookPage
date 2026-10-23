import { describe, expect, it } from 'vitest';
import { businessPatchSchema } from './business.js';
import { publishIssues } from './profile.js';
import { canUseTemplate, CLASSIC_FALLBACK, contrast, mergeTheme, noticeText, onAccent } from './site.js';
import { parseTemplate, resolveSite } from './templates.js';

const row = (patch: Record<string, unknown> = {}) => ({
  id: '0192a0c4-0000-7000-8000-000000000002',
  slug: 'bold',
  name: 'Bold',
  description: 'Huge type.',
  category: 'home',
  thumbnailUrl: null,
  previewImageUrl: null,
  version: 1,
  isActive: true,
  isPremium: false,
  supportedSections: ['services', 'gallery', 'hours', 'contact'],
  defaultTheme: { accent: '#E07A3F', font: 'condensed' },
  layoutConfiguration: { sections: ['services', 'hours'], services: { display: 'rows', limit: 6 }, gallery: { limit: 4 }, labels: { services: 'What we do' } },
  schemaVersion: 1,
  ...patch,
});
const classic = row({ id: '0192a0c4-0000-7000-8000-000000000001', slug: 'classic', name: 'Classic', defaultTheme: { accent: '#F09C84', font: 'grotesk' } });

describe('parseTemplate', () => {
  it('accepts a valid row and parses its layout', () => {
    const parsed = parseTemplate(row());
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.template.layout.services.display).toBe('rows');
  });

  it('rejects layouts with unknown keys, bad values or sections the template does not support', () => {
    for (const layoutConfiguration of [
      { sections: ['services'], services: { display: 'cards', limit: 4 }, gallery: { limit: 1 }, labels: {}, script: 'alert(1)' },
      { sections: ['services'], services: { display: 'carousel', limit: 4 }, gallery: { limit: 1 }, labels: {} },
      { sections: ['services', 'services'], services: { display: 'cards', limit: 4 }, gallery: { limit: 1 }, labels: {} },
      { sections: ['faq'], services: { display: 'cards', limit: 4 }, gallery: { limit: 1 }, labels: {} },
      'not json at all',
      null,
    ]) {
      const parsed = parseTemplate(row({ layoutConfiguration }));
      expect(parsed).toMatchObject({ ok: false, code: 'invalid' });
    }
  });

  it('refuses schema versions it does not know instead of guessing', () => {
    expect(parseTemplate(row({ schemaVersion: 99 }))).toMatchObject({ ok: false, code: 'unsupported' });
  });

  it('rejects malformed metadata', () => {
    expect(parseTemplate(row({ slug: 'Bad Slug' })).ok).toBe(false);
    expect(parseTemplate(row({ defaultTheme: { accent: 'red', font: 'grotesk' } })).ok).toBe(false);
  });
});

describe('resolveSite', () => {
  it('uses the selected template with the owner theme on top', () => {
    const site = resolveSite({ selected: row(), fallback: classic, theme: { accent: '#2f55d4' } });
    expect(site.template.slug).toBe('bold');
    expect(site.theme).toEqual({ accent: '#2F55D4', font: 'condensed' });
    expect(site.notice).toBeNull();
  });

  it('falls back to Classic and says why when the pick is inactive, invalid, unsupported or missing', () => {
    const cases = [
      [{ selected: row({ isActive: false }) }, 'inactive'],
      [{ selected: row({ layoutConfiguration: { nope: true } }) }, 'invalid'],
      [{ selected: row({ schemaVersion: 2 }) }, 'unsupported'],
      [{ selected: null, selectedMissing: 'bold' }, 'missing'],
    ] as const;
    for (const [input, code] of cases) {
      const site = resolveSite({ ...input, fallback: classic, theme: null });
      expect(site.template.slug).toBe('classic');
      expect(site.notice).toEqual({ code, requested: 'bold' });
    }
  });

  it('never picks silently: no notice only when nothing was chosen', () => {
    expect(resolveSite({ selected: null, fallback: classic, theme: null }).notice).toBeNull();
  });

  it('still renders from code when the Classic row itself is broken', () => {
    const site = resolveSite({ selected: null, fallback: { ...classic, layoutConfiguration: 'oops' }, theme: { font: 'nope' } });
    expect(site.template).toEqual(CLASSIC_FALLBACK);
    expect(site.theme.font).toBe('grotesk');
  });
});

describe('premium templates', () => {
  const premium = row({ isPremium: true });

  it('render on Pro', () => {
    expect(resolveSite({ selected: premium, fallback: classic, theme: null, plan: 'pro' })).toMatchObject({ template: { slug: 'bold' }, notice: null });
  });

  it('fall back to Classic with a "locked" notice on free (and when no plan is given)', () => {
    for (const plan of ['free', undefined] as const) {
      const site = resolveSite({ selected: premium, fallback: classic, theme: null, ...(plan ? { plan } : {}) });
      expect(site.template.slug).toBe('classic');
      expect(site.notice).toEqual({ code: 'locked', requested: 'bold' });
    }
  });

  it('canUseTemplate only gates premium ones', () => {
    expect(canUseTemplate({ isPremium: false }, 'free')).toBe(true);
    expect(canUseTemplate({ isPremium: true }, 'free')).toBe(false);
    expect(canUseTemplate({ isPremium: true }, 'pro')).toBe(true);
    expect(noticeText({ code: 'locked', requested: 'Bloom' })).toContain('Pro template');
  });
});

describe('theme', () => {
  it('ignores bad overrides', () => {
    expect(mergeTheme({ accent: '#111111', font: 'mono' }, { accent: 'javascript:alert(1)' as never })).toEqual({ accent: '#111111', font: 'mono' });
  });

  it('picks a readable text colour for any accent', () => {
    for (const accent of ['#F09C84', '#141210', '#FFFFFF', '#2F55D4', '#D9A033']) {
      expect(contrast(accent, onAccent(accent))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('only lets onboarding change colour and font, never the layout', () => {
    expect(businessPatchSchema.safeParse({ theme: { accent: '#123456' } }).success).toBe(true);
    expect(businessPatchSchema.safeParse({ theme: { layout: 'menu' } }).success).toBe(false);
    expect(businessPatchSchema.safeParse({ templateId: 'classic' }).success).toBe(false);
  });
});

describe('publishIssues', () => {
  it('points each problem at the new step order', () => {
    const issues = publishIssues({ name: '', category: null, locationType: 'online', addressLine1: null, city: null, serviceAreas: [], phone: null, hours: [], services: [], staff: [] });
    expect(issues.map((i) => i.step)).toEqual([2, 2, 2, 3, 4, 4]);
  });
});
