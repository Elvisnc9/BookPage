// The trusted code registry: which component draws each template slug, and
// which layout schema versions it understands. The database decides which
// templates exist and which one a business uses; this file decides how each is
// drawn. A slug or schema version the registry doesn't know falls back to
// Classic, with a notice for the owner. Nothing from the database is executed.
import { FALLBACK_TEMPLATE_SLUG, type ResolvedSite, type TemplateNotice } from '@bookpage/shared';
import type { FunctionComponent } from 'preact';
import type { SiteModel } from './model';
import { Atelier } from './templates/Atelier';
import { Billboard } from './templates/Billboard';
import { Bistro } from './templates/Bistro';
import { Bloom } from './templates/Bloom';
import { Carte } from './templates/Carte';
import { Classic } from './templates/Classic';
import { Folio } from './templates/Folio';
import { Hatch } from './templates/Hatch';
import { Hearth } from './templates/Hearth';
import { Journal } from './templates/Journal';
import { Neighbour } from './templates/Neighbour';
import { Noir } from './templates/Noir';
import { Practice } from './templates/Practice';
import { Pulse } from './templates/Pulse';
import { Quiet } from './templates/Quiet';
import { Shelf } from './templates/Shelf';
import { Stockroom } from './templates/Stockroom';

export interface TemplateRenderer {
  component: FunctionComponent<{ site: SiteModel }>;
  /** Layout schema versions this implementation can draw. */
  schemaVersions: readonly number[];
}

export const REGISTRY: Readonly<Record<string, TemplateRenderer>> = Object.freeze({
  classic: { component: Classic, schemaVersions: [1] },
  billboard: { component: Billboard, schemaVersions: [1] },
  quiet: { component: Quiet, schemaVersions: [1] },
  journal: { component: Journal, schemaVersions: [1] },
  carte: { component: Carte, schemaVersions: [1] },
  shelf: { component: Shelf, schemaVersions: [1] },
  neighbour: { component: Neighbour, schemaVersions: [1] },
  noir: { component: Noir, schemaVersions: [1] },
  pulse: { component: Pulse, schemaVersions: [1] },
  folio: { component: Folio, schemaVersions: [1] },
  practice: { component: Practice, schemaVersions: [1] },
  bistro: { component: Bistro, schemaVersions: [1] },
  hatch: { component: Hatch, schemaVersions: [1] },
  hearth: { component: Hearth, schemaVersions: [1] },
  atelier: { component: Atelier, schemaVersions: [1] },
  stockroom: { component: Stockroom, schemaVersions: [1] },
  bloom: { component: Bloom, schemaVersions: [1] },
});

export interface Rendering {
  slug: string;
  renderer: TemplateRenderer;
  /** Set when the resolved template can't be drawn here and Classic stands in. */
  notice: TemplateNotice | null;
}

/** The implementation for a resolved template. Used by the booking page and the preview alike. */
export function rendererFor(template: ResolvedSite['template']): Rendering {
  const renderer = Object.hasOwn(REGISTRY, template.slug) ? REGISTRY[template.slug] : undefined;
  if (!renderer) return { slug: FALLBACK_TEMPLATE_SLUG, renderer: REGISTRY[FALLBACK_TEMPLATE_SLUG]!, notice: { code: 'missing', requested: template.slug } };
  if (!renderer.schemaVersions.includes(template.schemaVersion)) {
    return { slug: FALLBACK_TEMPLATE_SLUG, renderer: REGISTRY[FALLBACK_TEMPLATE_SLUG]!, notice: { code: 'unsupported', requested: template.slug } };
  }
  return { slug: template.slug, renderer, notice: null };
}
