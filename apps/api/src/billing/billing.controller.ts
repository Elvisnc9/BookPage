import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { type CheckoutRequest, checkoutRequestSchema } from '@bookpage/shared';
import { ClerkAuthGuard, CurrentAuth } from '../auth/clerk-auth.guard';
import { OWNER_LIMITS, OWNER_RARE_LIMITS, OwnerThrottlerGuard } from '../common/throttling';
import type { AuthUser } from '../auth/owners.service';
import { ZodPipe } from '../common/zod.pipe';
import { BillingService } from './billing.service';

/** The signed-in owner's plan: Pro checkout, renewal, and the domain that comes with it. */
@Controller('billing')
@UseGuards(ClerkAuthGuard, OwnerThrottlerGuard)
@Throttle(OWNER_LIMITS)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  async get(@CurrentAuth() auth: AuthUser) {
    return { billing: await this.billing.view(auth.userId) };
  }

  @Get('domains')
  async domains(@Query('query') query = '') {
    return { options: await this.billing.searchDomains(query.slice(0, 100)) };
  }

  @Post('checkout')
  @Throttle(OWNER_RARE_LIMITS)
  @HttpCode(200)
  checkout(@CurrentAuth() auth: AuthUser, @Body(new ZodPipe(checkoutRequestSchema)) body: CheckoutRequest) {
    return this.billing.checkout(auth.userId, body);
  }

  @Get('checkout/:id')
  async session(@CurrentAuth() auth: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return { session: await this.billing.session(auth.userId, id) };
  }

  /** Development only (404 otherwise): pays a test checkout. No money moves. */
  @Post('test/:id/pay')
  @Throttle(OWNER_RARE_LIMITS)
  @HttpCode(200)
  async payTest(@CurrentAuth() auth: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return { billing: await this.billing.payTest(auth.userId, id) };
  }

  /** Pro owners who skipped the domain at checkout add it here. */
  @Post('domain')
  @Throttle(OWNER_RARE_LIMITS)
  @HttpCode(200)
  async addDomain(@CurrentAuth() auth: AuthUser, @Body(new ZodPipe(checkoutRequestSchema)) body: CheckoutRequest) {
    if (!body.domain) throw new BadRequestException('Choose a domain');
    return { billing: await this.billing.addDomain(auth.userId, body.domain) };
  }

  @Post('cancel')
  @Throttle(OWNER_RARE_LIMITS)
  @HttpCode(200)
  async cancel(@CurrentAuth() auth: AuthUser) {
    return { billing: await this.billing.cancel(auth.userId) };
  }

  @Post('resume')
  @Throttle(OWNER_RARE_LIMITS)
  @HttpCode(200)
  async resume(@CurrentAuth() auth: AuthUser) {
    return { billing: await this.billing.resume(auth.userId) };
  }
}
