import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BOOKING_STATUSES, type BookingStatus, type BookingStatusChange, bookingStatusChangeSchema } from '@bookpage/shared';
import { ClerkAuthGuard, CurrentAuth } from '../auth/clerk-auth.guard';
import { OWNER_EMAIL_LIMITS, OWNER_LIMITS, OwnerThrottlerGuard } from '../common/throttling';
import type { AuthUser } from '../auth/owners.service';
import { ZodPipe } from '../common/zod.pipe';
import { OwnerBookingsService } from './owner-bookings.service';

const asDate = (value?: string) => (value && !Number.isNaN(Date.parse(value)) ? new Date(value) : undefined);

/** The dashboard's bookings: Today numbers, lists by date/status, and approve/decline/cancel. */
@Controller('business')
@UseGuards(ClerkAuthGuard, OwnerThrottlerGuard)
@Throttle(OWNER_LIMITS)
export class OwnerBookingsController {
  constructor(private readonly bookings: OwnerBookingsService) {}

  @Get('summary')
  summary(@CurrentAuth() auth: AuthUser) {
    return this.bookings.summary(auth.userId);
  }

  /** ?from=ISO&to=ISO&status=pending,confirmed&order=asc|desc */
  @Get('bookings')
  async list(
    @CurrentAuth() auth: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('order') order?: string,
  ) {
    const statuses = (status ?? '')
      .split(',')
      .filter((s): s is BookingStatus => (BOOKING_STATUSES as readonly string[]).includes(s));
    const bookings = await this.bookings.list(auth.userId, {
      from: asDate(from),
      to: asDate(to),
      statuses,
      order: order === 'desc' ? 'desc' : 'asc',
    });
    return { bookings };
  }

  @Post('bookings/:id/status')
  @Throttle(OWNER_EMAIL_LIMITS)
  @HttpCode(200)
  change(
    @CurrentAuth() auth: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(bookingStatusChangeSchema)) body: BookingStatusChange,
  ) {
    return this.bookings.changeStatus(auth.userId, id, body);
  }
}
