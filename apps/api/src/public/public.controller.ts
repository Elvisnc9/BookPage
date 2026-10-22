import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  type BookingRequest,
  bookingRequestSchema,
  cancelRequestSchema,
  type EnquiryRequest,
  enquiryRequestSchema,
  type RescheduleRequest,
  rescheduleRequestSchema,
} from '@bookpage/shared';
import { ZodPipe } from '../common/zod.pipe';
import { PUBLIC_READ_LIMITS, PublicThrottlerGuard } from './public-throttler.guard';
import { PublicService } from './public.service';

/**
 * Booking-page endpoints. No session: customers never sign in. The web app
 * calls these server-side from {slug}.bookpage.app, so the slug in the path
 * always matches the page's own host.
 *
 * Rate limited per visitor IP and business: writes at 10/min and 60/day,
 * reads far more loosely. Over the limit is a 429.
 */
@Controller('public/:slug')
@UseGuards(PublicThrottlerGuard)
export class PublicController {
  constructor(private readonly pub: PublicService) {}

  @Get()
  @Throttle(PUBLIC_READ_LIMITS)
  profile(@Param('slug') slug: string) {
    return this.pub.profile(slug);
  }

  @Get('availability')
  @Throttle(PUBLIC_READ_LIMITS)
  availability(
    @Param('slug') slug: string,
    @Query('serviceId', ParseUUIDPipe) serviceId: string,
    @Query('staffId') staffId?: string,
    @Query('from') from?: string,
    @Query('days') days = '14',
  ) {
    const staff = staffId && /^[0-9a-f-]{36}$/i.test(staffId) ? staffId : undefined;
    return this.pub.availability(slug, serviceId, staff, from, Number(days) || 14);
  }

  @Post('bookings')
  book(@Param('slug') slug: string, @Body(new ZodPipe(bookingRequestSchema)) body: BookingRequest) {
    return this.pub.book(slug, body);
  }

  @Get('bookings/:id')
  @Throttle(PUBLIC_READ_LIMITS)
  booking(@Param('slug') slug: string, @Param('id', ParseUUIDPipe) id: string, @Query('token') token = '') {
    return this.pub.getBooking(slug, id, token);
  }

  @Post('bookings/:id/cancel')
  @HttpCode(200)
  cancel(
    @Param('slug') slug: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(cancelRequestSchema)) body: { token: string },
  ) {
    return this.pub.cancel(slug, id, body.token);
  }

  @Post('bookings/:id/reschedule')
  @HttpCode(200)
  reschedule(
    @Param('slug') slug: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(rescheduleRequestSchema)) body: RescheduleRequest,
  ) {
    return this.pub.reschedule(slug, id, body);
  }

  @Post('enquiries')
  enquire(@Param('slug') slug: string, @Body(new ZodPipe(enquiryRequestSchema)) body: EnquiryRequest) {
    return this.pub.enquire(slug, body);
  }
}
