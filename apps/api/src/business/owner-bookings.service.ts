import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  addDays,
  allowedChanges,
  type BookingStatus,
  type BookingStatusChange,
  localDate,
  type OwnerBooking,
  type OwnerSummary,
  weekdayOf,
  zonedToUtc,
} from '@bookpage/shared';
import { NotificationsService } from '../email/notifications.service';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE: BookingStatus[] = ['pending', 'confirmed'];
const MAX = 300;

const INCLUDE = {
  staff: { select: { name: true } },
  customer: { select: { name: true, email: true, phone: true } },
} satisfies Prisma.BookingInclude;

type Row = Prisma.BookingGetPayload<{ include: typeof INCLUDE }>;

/** The owner's view of their bookings. Every query is scoped to the signed-in owner's business. */
@Injectable()
export class OwnerBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(ownerId: string, opts: { from?: Date; to?: Date; statuses?: BookingStatus[]; order: 'asc' | 'desc' }): Promise<OwnerBooking[]> {
    const business = await this.business(ownerId);
    const rows = await this.prisma.booking.findMany({
      where: {
        businessId: business.id,
        ...(opts.statuses?.length ? { status: { in: opts.statuses } } : {}),
        ...(opts.from || opts.to ? { startsAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lt: opts.to } : {}) } } : {}),
      },
      include: INCLUDE,
      orderBy: { startsAt: opts.order },
      take: MAX,
    });
    return rows.map(toOwner);
  }

  /** The numbers on the Today screen, worked out in the business's own time zone. */
  async summary(ownerId: string, now = new Date()): Promise<OwnerSummary> {
    const business = await this.business(ownerId);
    const tz = business.timezone;
    const today = localDate(now, tz).date;
    const dayStart = zonedToUtc(today, 0, tz);
    const dayEnd = zonedToUtc(addDays(today, 1), 0, tz);
    // Week = Monday to Sunday containing today.
    const monday = addDays(today, 1 - weekdayOf(today));
    const weekStart = zonedToUtc(monday, 0, tz);
    const weekEnd = zonedToUtc(addDays(monday, 7), 0, tz);
    const scope = { businessId: business.id, status: { in: ACTIVE } };

    const [todayCount, weekCount, pendingCount, next] = await Promise.all([
      this.prisma.booking.count({ where: { ...scope, startsAt: { gte: dayStart, lt: dayEnd } } }),
      this.prisma.booking.count({ where: { ...scope, startsAt: { gte: weekStart, lt: weekEnd } } }),
      this.prisma.booking.count({ where: { businessId: business.id, status: 'pending', startsAt: { gte: now } } }),
      this.prisma.booking.findFirst({ where: { ...scope, startsAt: { gte: now } }, include: INCLUDE, orderBy: { startsAt: 'asc' } }),
    ]);
    return { timezone: tz, today, todayCount, weekCount, pendingCount, next: next && toOwner(next) };
  }

  async changeStatus(ownerId: string, bookingId: string, change: BookingStatusChange): Promise<OwnerBooking> {
    const business = await this.business(ownerId);
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, businessId: business.id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const allowed = allowedChanges(booking.status, booking.startsAt);
    if (!allowed.includes(change.status)) {
      throw new BadRequestException(`A ${booking.status.replace('_', '-')} booking can't be marked ${change.status.replace('_', '-')}`);
    }

    const now = new Date();
    // Conditional on the status we checked, so two clicks (or two tabs) can't both apply.
    const updated = await this.prisma.booking.updateMany({
      where: { id: booking.id, status: booking.status },
      data: {
        status: change.status,
        ...(change.status === 'confirmed' ? { confirmedAt: now } : {}),
        ...(change.status === 'cancelled' ? { cancelledAt: now, cancelReason: change.reason || (booking.status === 'pending' ? 'Declined by business' : 'Cancelled by business') } : {}),
      },
    });
    if (updated.count !== 1) throw new BadRequestException('This booking just changed. Refresh and try again.');

    if (change.status === 'confirmed') {
      void this.notifications.dispatch('approval email', () => this.notifications.bookingApproved(booking.id));
    } else if (change.status === 'cancelled' && booking.startsAt > now) {
      void this.notifications.dispatch('business cancellation email', () =>
        this.notifications.bookingCancelledByBusiness(booking.id, booking.status === 'pending'),
      );
    }

    return toOwner(await this.prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, include: INCLUDE }));
  }

  private async business(ownerId: string) {
    const business = await this.prisma.business.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, timezone: true },
    });
    if (!business) throw new NotFoundException('Set up your business first');
    return business;
  }
}

function toOwner(b: Row): OwnerBooking {
  return {
    id: b.id,
    status: b.status,
    source: b.source,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    serviceName: b.serviceName,
    staffName: b.staff.name,
    priceType: b.priceType,
    priceMinor: b.priceMinor,
    currency: b.currency,
    note: b.customerNote,
    customer: { name: b.customer.name, email: b.customer.email, phone: b.customer.phone },
    createdAt: b.createdAt.toISOString(),
    cancelReason: b.cancelReason,
  };
}
