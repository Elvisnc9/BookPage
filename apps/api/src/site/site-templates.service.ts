import { Injectable, Logger } from '@nestjs/common';
import { FALLBACK_TEMPLATE_SLUG, parseTemplate, type ResolvedSite, resolveSite, type SiteTemplate } from '@bookpage/shared';
import type { SiteTemplate as TemplateRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** How long the Classic row is reused before being re-read (it only changes by migration). */
const FALLBACK_TTL_MS = 60_000;

/**
 * The template catalogue. Rows are validated on every read; a row that fails is
 * logged and left out, never rendered. Which component draws a template is the
 * web app's business (its registry); this service only says what's offered.
 */
@Injectable()
export class SiteTemplatesService {
  private readonly log = new Logger(SiteTemplatesService.name);
  private fallback: { row: TemplateRow | null; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Active templates in gallery order. Invalid rows are skipped (and logged). */
  async list(): Promise<SiteTemplate[]> {
    const rows = await this.prisma.siteTemplate.findMany({ where: { isActive: true }, orderBy: { position: 'asc' } });
    const templates: SiteTemplate[] = [];
    for (const row of rows) {
      const parsed = parseTemplate(row);
      if (parsed.ok) templates.push(parsed.template);
      else this.log.warn(`Template "${row.slug}" left out of the gallery: ${parsed.reason}`);
    }
    return templates;
  }

  /** The template for an id, only if it's valid and offered; null otherwise. */
  async findSelectable(id: string): Promise<SiteTemplate | null> {
    const row = await this.prisma.siteTemplate.findUnique({ where: { id } });
    const parsed = row ? parseTemplate(row) : null;
    return parsed?.ok && parsed.template.isActive ? parsed.template : null;
  }

  async classicId(): Promise<string | null> {
    return (await this.classicRow())?.id ?? null;
  }

  /** What a business's page renders with, given its selected row (loaded with the business) and theme. */
  async resolve(selected: TemplateRow | null, theme: unknown): Promise<ResolvedSite> {
    const site = resolveSite({ selected, fallback: await this.classicRow(), theme });
    if (site.notice) this.log.warn(`Template fallback (${site.notice.code}) for "${site.notice.requested}"`);
    return site;
  }

  private async classicRow(): Promise<TemplateRow | null> {
    if (this.fallback && Date.now() - this.fallback.at < FALLBACK_TTL_MS) return this.fallback.row;
    const row = await this.prisma.siteTemplate.findUnique({ where: { slug: FALLBACK_TEMPLATE_SLUG } });
    this.fallback = { row, at: Date.now() };
    return row;
  }
}
