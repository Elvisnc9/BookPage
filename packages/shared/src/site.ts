// Website templates: the parts both the owner app and the booking page need at runtime.
// No zod here, so the onboarding bundle stays small; validation lives in templates.ts.

/** Bump when LayoutConfig changes shape; old rows keep rendering through their own schema. */
export const TEMPLATE_SCHEMA_VERSION = 1;

/** The template every business can always fall back to. Its config also ships in code (CLASSIC_LAYOUT). */
export const FALLBACK_TEMPLATE_SLUG = 'classic';

/**
 * What a business has paid for. Billing sets it (later); until then it's set by hand.
 * Pro unlocks premium templates.
 */
export const PLANS = ['free', 'pro'] as const;
export type Plan = (typeof PLANS)[number];

/** Whether a business on `plan` may use a template. Premium templates need Pro. */
export const canUseTemplate = (t: Pick<SiteTemplate, 'isPremium'>, plan: Plan) => !t.isPremium || plan === 'pro';

/** Where "Unlock with Pro" points until checkout exists: the pricing section (with the waitlist). */
export const PRO_UPGRADE_PATH = '/pricing';

/** Sections a template can show, besides the header and hero, which every template has. */
export const SITE_SECTIONS = ['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'] as const;
export type SiteSection = (typeof SITE_SECTIONS)[number];

/** How a template lays out the service list. */
export const SERVICE_DISPLAYS = ['cards', 'list', 'menu', 'grid', 'rows'] as const;
export type ServiceDisplay = (typeof SERVICE_DISPLAYS)[number];

/** Display faces an owner can pick. The web app maps each key to a self-hosted family. */
export const SITE_FONTS = {
  grotesk: { label: 'Grotesk', note: 'Clean and modern' },
  didone: { label: 'Didone', note: 'Elegant, high contrast' },
  condensed: { label: 'Condensed', note: 'Loud and sporty' },
  soft: { label: 'Friendly', note: 'Warm and approachable' },
  mono: { label: 'Mono', note: 'Studio and technical' },
} as const;
export type SiteFont = keyof typeof SITE_FONTS;
export const SITE_FONT_KEYS = Object.keys(SITE_FONTS) as SiteFont[];

/** Gallery filters. Every template belongs to one. */
export const TEMPLATE_GROUPS = {
  beauty: 'Beauty & wellness',
  food: 'Food & drink',
  fitness: 'Fitness',
  creative: 'Creative',
  professional: 'Professional',
  retail: 'Retail',
  home: 'Home & local',
} as const;
export type TemplateGroup = keyof typeof TEMPLATE_GROUPS;
export const TEMPLATE_GROUP_KEYS = Object.keys(TEMPLATE_GROUPS) as TemplateGroup[];

/** Brand colours offered in onboarding, alongside each template's own default. */
export const ACCENT_SWATCHES = [
  { name: 'Peach', hex: '#F09C84' },
  { name: 'Tangerine', hex: '#E07A3F' },
  { name: 'Tomato', hex: '#D9432B' },
  { name: 'Rose', hex: '#E5739A' },
  { name: 'Ochre', hex: '#D9A033' },
  { name: 'Olive', hex: '#6F7D3C' },
  { name: 'Teal', hex: '#1F7A72' },
  { name: 'Cobalt', hex: '#2F55D4' },
  { name: 'Plum', hex: '#6B3A6E' },
  { name: 'Ink', hex: '#141210' },
] as const;

export interface SiteTheme {
  /** Brand colour, #RRGGBB. */
  accent: string;
  font: SiteFont;
}

export interface LayoutConfig {
  /** Sections in page order. A section with no data is skipped on the live page. */
  sections: SiteSection[];
  services: { display: ServiceDisplay; limit: number };
  gallery: { limit: number };
  /** Optional section headings; each template has its own defaults. */
  labels: Partial<Record<'services' | 'team' | 'gallery' | 'visit' | 'faq' | 'about', string>>;
}

/** A template row as the API hands it out: validated, with its layout parsed for its schema version. */
export interface SiteTemplate {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: TemplateGroup;
  thumbnailUrl: string | null;
  previewImageUrl: string | null;
  version: number;
  isActive: boolean;
  isPremium: boolean;
  supportedSections: SiteSection[];
  defaultTheme: SiteTheme;
  layout: LayoutConfig;
  schemaVersion: number;
}

/** Why the page isn't using the template the owner picked. Shown to the owner, never to customers. */
export interface TemplateNotice {
  code: 'missing' | 'inactive' | 'invalid' | 'unsupported' | 'locked';
  /** The slug (or id) the business asked for. */
  requested: string;
}

/** What a page renders with: the template that will actually draw it, and the owner's theme. */
export interface ResolvedSite {
  template: Pick<SiteTemplate, 'id' | 'slug' | 'name' | 'version' | 'schemaVersion' | 'layout'>;
  theme: SiteTheme;
  notice: TemplateNotice | null;
}

/** Classic's config, in code, so a page can always render even if the template table is empty or broken. */
export const CLASSIC_LAYOUT: LayoutConfig = {
  sections: ['services', 'team', 'contact', 'hours', 'faq'],
  services: { display: 'cards', limit: 4 },
  gallery: { limit: 6 },
  labels: {},
};
export const CLASSIC_THEME: SiteTheme = { accent: '#F09C84', font: 'grotesk' };

export const CLASSIC_FALLBACK: ResolvedSite['template'] = {
  id: '00000000-0000-0000-0000-000000000000',
  slug: FALLBACK_TEMPLATE_SLUG,
  name: 'Classic',
  version: 1,
  schemaVersion: TEMPLATE_SCHEMA_VERSION,
  layout: CLASSIC_LAYOUT,
};

const HEX = /^#[0-9a-f]{6}$/i;

/** The template's default theme with the owner's choices on top. Bad values are ignored, not trusted. */
export function mergeTheme(base: SiteTheme, overrides: Partial<SiteTheme> | null | undefined): SiteTheme {
  const accent = overrides?.accent && HEX.test(overrides.accent) ? overrides.accent.toUpperCase() : base.accent;
  const font = overrides?.font && overrides.font in SITE_FONTS ? overrides.font : base.font;
  return { accent, font };
}

/** WCAG relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour for a button filled with `accent`: whichever of ink or white reads better. */
export function onAccent(accent: string): '#FFFFFF' | '#141210' {
  return contrast(accent, '#FFFFFF') >= contrast(accent, '#141210') ? '#FFFFFF' : '#141210';
}

/** Owner-facing sentence for a fallback. */
export function noticeText(notice: TemplateNotice, fallbackName = 'Classic'): string {
  const why = {
    missing: "isn't available any more",
    inactive: 'has been retired',
    invalid: "couldn't be loaded",
    unsupported: 'needs an update before it can be used',
    locked: 'is a Pro template and this page is on the free plan',
  }[notice.code];
  return `The template you picked (${notice.requested}) ${why}, so your page is showing ${fallbackName} for now. Your content is safe; pick another template to change it.`;
}
