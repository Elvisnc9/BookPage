import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { isValidSlug } from '@bookpage/shared';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { SiteTemplatesService } from '../site/site-templates.service';
import { PUBLIC_READ_LIMITS, PublicThrottlerGuard } from './public-throttler.guard';

/** Seeded demo pages: shown on the marketing site, never counted as real businesses. */
const DEMO_SLUGS = ['glowstudio'];
const STATS_TTL_MS = 20_000;

const waitlistSchema = z.object({
  email: z.email('Enter a valid email').max(120),
  kind: z.enum(['pro']).default('pro'),
});

/** Marketing site: the template showcase, "is this page address free?" and the Pro waitlist. No session. */
@Controller('marketing')
@UseGuards(PublicThrottlerGuard)
export class MarketingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: SiteTemplatesService,
  ) {}

  /** The same active, validated catalogue onboarding offers, so the showcase never shows a template owners can't pick. */
  @Get('templates')
  @Throttle(PUBLIC_READ_LIMITS)
  async listTemplates() {
    return { templates: await this.templates.list() };
  }

  @Get('slug-available')
  @Throttle(PUBLIC_READ_LIMITS)
  async slugAvailable(@Query('slug') raw = '') {
    const slug = raw.trim().toLowerCase();
    if (!isValidSlug(slug) || slug.startsWith('draft-')) return { slug, available: false, valid: false };
    const taken = await this.prisma.business.count({ where: { slug } });
    return { slug, available: taken === 0, valid: true };
  }

  /**
   * Real, live totals for the marketing page's "Road to 1,000" board: live booking
   * pages and bookings taken through them. The demo page doesn't count. Cached for
   * 20 seconds, so a busy marketing page costs at most three small queries a minute.
   */
  @Get('stats')
  @Throttle(PUBLIC_READ_LIMITS)
  async stats() {
    const now = Date.now();
    if (!this.statsCache || now - this.statsCache.at > STATS_TTL_MS) {
      const real = { publishedAt: { not: null }, slug: { notIn: DEMO_SLUGS } };
      const [businesses, bookings] = await Promise.all([
        this.prisma.business.count({ where: real }),
        this.prisma.booking.count({ where: { status: { not: 'cancelled' }, business: real } }),
      ]);
      this.statsCache = { at: now, value: { businesses, bookings } };
    }
    return this.statsCache.value;
  }

  private statsCache: { at: number; value: { businesses: number; bookings: number } } | null = null;

  /** Idempotent: joining twice is fine and says nothing about who is already on the list. */
  @Post('waitlist')
  @HttpCode(200)
  async join(@Body(new ZodPipe(waitlistSchema)) body: z.infer<typeof waitlistSchema>) {
    const email = body.email.trim().toLowerCase();
    await this.prisma.waitlistEntry.upsert({
      where: { email_kind: { email, kind: body.kind } },
      update: {},
      create: { email, kind: body.kind },
    });
    return { ok: true };
  }
}
