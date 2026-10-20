import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { isValidSlug } from '@bookpage/shared';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { SiteTemplatesService } from '../site/site-templates.service';
import { PUBLIC_READ_LIMITS, PublicThrottlerGuard } from './public-throttler.guard';

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
