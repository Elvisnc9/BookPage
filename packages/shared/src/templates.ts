import { z } from 'zod';
import {
  CLASSIC_FALLBACK,
  CLASSIC_THEME,
  canUseTemplate,
  type LayoutConfig,
  mergeTheme,
  type Plan,
  type ResolvedSite,
  SERVICE_DISPLAYS,
  SITE_FONT_KEYS,
  SITE_SECTIONS,
  type SiteTemplate,
  type SiteTheme,
  TEMPLATE_GROUP_KEYS,
  type TemplateNotice,
} from './site.js';

/**
 * Template rows come from the database, so nothing in them is trusted: every
 * row is parsed here before anything renders it. Rows carry data only (which
 * sections, in what order, which defaults); the code that draws a template
 * lives in the web app's registry, keyed by slug. Nothing from the database
 * is ever executed.
 */

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a #RRGGBB colour');

export const siteThemeSchema = z.object({ accent: hex, font: z.enum(SITE_FONT_KEYS) }).strict();
/** What the owner may change from onboarding. Never the layout. */
export const siteThemePatchSchema = siteThemeSchema.partial().strict();

const label = z.string().trim().min(1).max(40);

export const layoutConfigV1Schema = z
  .object({
    sections: z
      .array(z.enum(SITE_SECTIONS))
      .max(SITE_SECTIONS.length)
      .refine((s) => new Set(s).size === s.length, 'Each section can appear once'),
    services: z.object({ display: z.enum(SERVICE_DISPLAYS), limit: z.number().int().min(1).max(50) }).strict(),
    gallery: z.object({ limit: z.number().int().min(0).max(24) }).strict(),
    labels: z
      .object({ services: label, team: label, gallery: label, visit: label, faq: label, about: label })
      .partial()
      .strict(),
  })
  .strict() satisfies z.ZodType<LayoutConfig>;

/** One parser per schema version. A row whose version isn't here is "unsupported", not guessed at. */
export const LAYOUT_SCHEMAS: Record<number, z.ZodType<LayoutConfig>> = { 1: layoutConfigV1Schema };

export const siteTemplateRowSchema = z.object({
  id: z.uuid(),
  slug: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
  name: z.string().trim().min(1).max(40),
  description: z.string().trim().min(1).max(200),
  category: z.enum(TEMPLATE_GROUP_KEYS),
  thumbnailUrl: z.string().max(500).nullable(),
  previewImageUrl: z.string().max(500).nullable(),
  version: z.number().int().min(1),
  isActive: z.boolean(),
  isPremium: z.boolean(),
  supportedSections: z.array(z.enum(SITE_SECTIONS)),
  defaultTheme: siteThemeSchema,
  layoutConfiguration: z.unknown(),
  schemaVersion: z.number().int().min(1),
});
export type SiteTemplateRow = z.input<typeof siteTemplateRowSchema>;

export type ParsedTemplate = { ok: true; template: SiteTemplate } | { ok: false; code: 'invalid' | 'unsupported'; reason: string };

/** Validates a database row and its layout for the row's own schema version. */
export function parseTemplate(row: unknown): ParsedTemplate {
  const base = siteTemplateRowSchema.safeParse(row);
  if (!base.success) return { ok: false, code: 'invalid', reason: base.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };

  const { layoutConfiguration, ...rest } = base.data;
  const schema = LAYOUT_SCHEMAS[rest.schemaVersion];
  if (!schema) return { ok: false, code: 'unsupported', reason: `schema version ${rest.schemaVersion} is not supported` };

  const layout = schema.safeParse(layoutConfiguration);
  if (!layout.success) return { ok: false, code: 'invalid', reason: layout.error.issues.map((i) => `layout.${i.path.join('.')}: ${i.message}`).join('; ') };

  const unsupported = layout.data.sections.filter((s) => !rest.supportedSections.includes(s));
  if (unsupported.length) return { ok: false, code: 'invalid', reason: `layout uses sections the template doesn't support: ${unsupported.join(', ')}` };

  return { ok: true, template: { ...rest, layout: layout.data } };
}

/**
 * Picks what a business's page renders with. The selected template wins when it
 * is valid and active; otherwise Classic (from the database, or from code if
 * even that row is unusable) with a notice saying why. Never switches silently.
 */
export function resolveSite(input: {
  /** The business's selected template row, or null when it never picked one. */
  selected: unknown | null;
  /** True when the business points at a template id that no longer exists. */
  selectedMissing?: string | null;
  /** The Classic row from the database, if it could be loaded. */
  fallback: unknown | null;
  /** The owner's colour and font choices (Business.theme). */
  theme: unknown;
  /** The business's plan; premium templates fall back to Classic on free. Defaults to free. */
  plan?: Plan;
}): ResolvedSite {
  const overrides = siteThemePatchSchema.safeParse(input.theme ?? {});
  const themeOf = (base: SiteTheme) => mergeTheme(base, overrides.success ? overrides.data : null);

  let notice: TemplateNotice | null = input.selectedMissing ? { code: 'missing', requested: input.selectedMissing } : null;
  if (input.selected) {
    const parsed = parseTemplate(input.selected);
    const requested = (input.selected as { slug?: unknown }).slug;
    const name = typeof requested === 'string' ? requested : 'unknown';
    if (parsed.ok && parsed.template.isActive && canUseTemplate(parsed.template, input.plan ?? 'free')) {
      return { template: pick(parsed.template), theme: themeOf(parsed.template.defaultTheme), notice: null };
    }
    notice = { code: !parsed.ok ? parsed.code : !parsed.template.isActive ? 'inactive' : 'locked', requested: name };
  }

  const fallback = input.fallback ? parseTemplate(input.fallback) : null;
  if (fallback?.ok) return { template: pick(fallback.template), theme: themeOf(fallback.template.defaultTheme), notice };
  return { template: CLASSIC_FALLBACK, theme: themeOf(CLASSIC_THEME), notice };
}

const pick = (t: SiteTemplate): ResolvedSite['template'] => ({
  id: t.id,
  slug: t.slug,
  name: t.name,
  version: t.version,
  schemaVersion: t.schemaVersion,
  layout: t.layout,
});
