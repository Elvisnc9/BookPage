import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { calendarUrl, dashboardUrl, manageUrl, pageOrigin } from './links';
import {
  type BookingDetails,
  customerApproved,
  customerCancelledByBusiness,
  customerConfirmation,
  customerReminder,
  customerRescheduled,
  ownerCancelled,
  ownerEnquiry,
  ownerRescheduled,
  ownerNewBooking,
} from './templates';

const BOOKING_INCLUDE = {
  business: { include: { owner: { select: { email: true } } } },
  staff: { select: { name: true } },
  customer: true,
} as const;

/**
 * Decides who gets which email. Callers fire these after the database write
 * has committed; a failed email is logged and never fails the booking.
 */
@Injectable()
export class NotificationsService {
  private readonly log = new Logger('Notifications');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Runs a notification without making the caller wait or fail. Returns the promise for tests. */
  dispatch(what: string, job: () => Promise<void>): Promise<void> {
    return job().catch((error: unknown) => this.log.error(`${what} failed: ${error instanceof Error ? error.message : error}`));
  }

  /** Customer confirmation (or "request sent") + owner alert. */
  async bookingCreated(bookingId: string): Promise<void> {
    const b = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    if (b.status !== 'confirmed' && b.status !== 'pending') return;
    const details = toDetails(b);
    const fromName = `${b.business.name} via BookPage`;

    await Promise.all([
      b.customer.email &&
        this.email.send({
          ...customerConfirmation({
            ...details,
            status: b.status,
            manageUrl: manageUrl(b.business.slug, b.id),
            calendarUrl: calendarUrl(b.business.slug, b.id),
          }),
          to: b.customer.email,
          fromName,
          replyTo: b.business.email ?? b.business.owner.email,
          idempotencyKey: `booking-confirmation/${b.id}`,
          kind: 'booking-confirmation',
        }),
      this.email.send({
        ...ownerNewBooking({
          ...details,
          status: b.status,
          customerEmail: b.customer.email ?? '',
          customerPhone: b.customer.phone,
          customerNote: b.customerNote,
          dashboardUrl: dashboardUrl(),
        }),
        to: b.business.owner.email,
        replyTo: b.customer.email,
        idempotencyKey: `owner-new-booking/${b.id}`,
        kind: 'owner-new-booking',
      }),
    ]);
  }

  /** Tells the owner a customer cancelled, so the freed time isn't a surprise. */
  async bookingCancelled(bookingId: string): Promise<void> {
    const b = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    await this.email.send({
      ...ownerCancelled({ ...toDetails(b), dashboardUrl: dashboardUrl() }),
      to: b.business.owner.email,
      replyTo: b.customer.email,
      idempotencyKey: `owner-cancelled/${b.id}`,
      kind: 'owner-cancelled',
    });
  }

  /** The customer moved their booking: new details to them, a heads-up to the owner. */
  async bookingRescheduled(bookingId: string, previousStart: Date): Promise<void> {
    const b = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    if (b.status !== 'confirmed' && b.status !== 'pending') return;
    const details = { ...toDetails(b), previousStart };
    // Keyed by the new time: moving twice sends twice, a retried send doesn't.
    const key = `${b.id}/${b.startsAt.toISOString()}`;
    await Promise.all([
      b.customer.email &&
        this.email.send({
          ...customerRescheduled({ ...details, manageUrl: manageUrl(b.business.slug, b.id), calendarUrl: calendarUrl(b.business.slug, b.id) }),
          to: b.customer.email,
          fromName: `${b.business.name} via BookPage`,
          replyTo: b.business.email ?? b.business.owner.email,
          idempotencyKey: `booking-rescheduled/${key}`,
          kind: 'booking-rescheduled',
        }),
      this.email.send({
        ...ownerRescheduled({ ...details, dashboardUrl: dashboardUrl() }),
        to: b.business.owner.email,
        replyTo: b.customer.email,
        idempotencyKey: `owner-rescheduled/${key}`,
        kind: 'owner-rescheduled',
      }),
    ]);
  }

  /** Enquiries go to the owner by email; reply-to is the customer so they can answer straight away. */
  async enquiryReceived(enquiryId: string): Promise<void> {
    const e = await this.prisma.enquiry.findUniqueOrThrow({
      where: { id: enquiryId },
      include: { business: { include: { owner: { select: { email: true } } } }, service: { select: { name: true } }, customer: true },
    });
    await this.email.send({
      ...ownerEnquiry({
        businessName: e.business.name,
        serviceName: e.service?.name ?? null,
        message: e.message,
        preferredDate: e.preferredDate?.toISOString().slice(0, 10) ?? null,
        customerName: e.customer.name,
        customerEmail: e.customer.email ?? '',
        customerPhone: e.customer.phone,
      }),
      to: e.business.owner.email,
      replyTo: e.customer.email,
      idempotencyKey: `owner-enquiry/${e.id}`,
      kind: 'owner-enquiry',
    });
  }

  /** The owner approved a pending booking. */
  async bookingApproved(bookingId: string): Promise<void> {
    const b = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    if (!b.customer.email) return;
    await this.email.send({
      ...customerApproved({ ...toDetails(b), manageUrl: manageUrl(b.business.slug, b.id), calendarUrl: calendarUrl(b.business.slug, b.id) }),
      to: b.customer.email,
      fromName: `${b.business.name} via BookPage`,
      replyTo: b.business.email ?? b.business.owner.email,
      idempotencyKey: `booking-approved/${b.id}`,
      kind: 'booking-approved',
    });
  }

  /** The owner declined (was pending) or cancelled (was confirmed) a booking. */
  async bookingCancelledByBusiness(bookingId: string, declined: boolean): Promise<void> {
    const b = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    if (!b.customer.email) return;
    await this.email.send({
      ...customerCancelledByBusiness({
        ...toDetails(b),
        declined,
        reason: b.cancelReason,
        bookAgainUrl: `${pageOrigin(b.business.slug)}/#book`,
      }),
      to: b.customer.email,
      fromName: `${b.business.name} via BookPage`,
      replyTo: b.business.email ?? b.business.owner.email,
      idempotencyKey: `booking-cancelled-by-business/${b.id}`,
      kind: declined ? 'booking-declined' : 'booking-cancelled-by-business',
    });
  }

  async reminder(bookingId: string): Promise<void> {
    const b = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    if (!b.customer.email) return;
    await this.email.send({
      ...customerReminder({ ...toDetails(b), manageUrl: manageUrl(b.business.slug, b.id) }),
      to: b.customer.email,
      fromName: `${b.business.name} via BookPage`,
      replyTo: b.business.email ?? b.business.owner.email,
      idempotencyKey: `booking-reminder/${b.id}`,
      kind: 'booking-reminder',
    });
  }
}

type LoadedBooking = Awaited<ReturnType<PrismaService['booking']['findUniqueOrThrow']>> & {
  business: { name: string; timezone: string; addressLine1: string | null; city: string | null; phone: string | null; locationType: string };
  staff: { name: string };
  customer: { name: string };
};

function toDetails(b: LoadedBooking): BookingDetails {
  const atPremises = b.business.locationType === 'premises' || b.business.locationType === 'both';
  const address = atPremises ? [b.business.addressLine1, b.business.city].filter(Boolean).join(', ') || null : null;
  return {
    businessName: b.business.name,
    timezone: b.business.timezone,
    serviceName: b.serviceName,
    staffName: b.staff.name,
    startsAt: b.startsAt,
    priceType: b.priceType,
    priceMinor: b.priceMinor,
    currency: b.currency,
    address,
    businessPhone: b.business.phone,
    customerName: b.customer.name,
  };
}
