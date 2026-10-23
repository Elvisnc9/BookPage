import { randomUUID, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type BookingRequest,
  type CreatedBooking,
  customerFieldsSchema,
  type EnquiryRequest,
  type PublicBooking,
  type PublicBusiness,
  type PublicDay,
  type RescheduleRequest,
  type ResolvedSite,
} from '@bookpage/shared';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';
import { hashToken } from '../common/tokens';
import { findSlots } from '../availability/engine';
import { manageToken } from '../email/links';
import { NotificationsService } from '../email/notifications.service';
import { addDays, isDateString, localDate, zonedToUtc } from '@bookpage/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MEDIA_META, mediaSlots } from '../site/media';
import { SiteTemplatesService } from '../site/site-templates.service';
import { isSlotTaken } from '../prisma/errors';

const ACTIVE = ['pending', 'confirmed'] as const;
const MAX_DAYS = 31;

const BUSINESS_VIEW = {
  bookingRules: true,
  hours: { orderBy: [{ weekday: 'asc' }, { opensAt: 'asc' }] },
  services: { where: { archivedAt: null }, orderBy: { position: 'asc' } },
  staff: { where: { archivedAt: null }, orderBy: { position: 'asc' }, include: { services: { select: { serviceId: true } } } },
  faqs: { where: { approved: true }, orderBy: { position: 'asc' }, select: { question: true, answer: true } },
  template: true,
  media: MEDIA_META,
} satisfies Prisma.BusinessInclude;

type LoadedBusiness = Prisma.BusinessGetPayload<{ include: typeof BUSINESS_VIEW }>;

export class SlotTakenException extends ConflictException {
  constructor() {
    super({ message: 'That time was just taken. Please pick another.', code: 'slot_taken' });
  }
}

/** Everything a customer can do on a booking page. Only published businesses are visible. */
@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly templates: SiteTemplatesService,
  ) {}

  async profile(slug: string): Promise<PublicBusiness> {
    const b = await this.load(slug);
    // A premium template on a free plan renders Classic here (the owner sees why in onboarding).
    return toPublic(b, await this.templates.resolve(b.template, b.theme, b.plan));
  }

  async availability(slug: string, serviceId: string, staffId: string | undefined, from: string | undefined, days: number): Promise<PublicDay[]> {
    const b = await this.load(slug);
    const today = localDate(new Date(), b.timezone).date;
    const fromDate = from && isDateString(from) && from > today ? from : today;
    const result = await this.slots(b, serviceId, staffId, fromDate, Math.min(Math.max(days, 1), MAX_DAYS));
    return result.map((d) => ({
      date: d.date,
      slots: d.slots.map((s) => ({ start: s.start.toISOString(), staffIds: s.staffIds })),
    }));
  }

  async book(slug: string, req: BookingRequest): Promise<CreatedBooking> {
    const b = await this.load(slug);
    const service = b.services.find((s) => s.id === req.serviceId && s.bookable && s.priceType !== 'quote');
    if (!service) throw new NotFoundException('That service can’t be booked online');

    const startsAt = new Date(req.startsAt);
    const { date } = localDate(startsAt, b.timezone);
    const [day] = await this.slots(b, service.id, req.staffId, date, 1);
    const slot = day?.slots.find((s) => s.start.getTime() === startsAt.getTime());
    if (!slot) throw new SlotTakenException();

    const fields = customerFieldsSchema.parse(b.bookingRules!.customerFields);
    const phone = this.phone(req.customer.phone, fields.phone, b.country);
    const customer = await this.upsertCustomer(b.id, req.customer.name, req.customer.email, phone, req.remindersConsent);

    // The id is chosen here so the manage token (derived from it) can be stored as a hash.
    const id = randomUUID();
    const token = manageToken(id);
    // A deposit holds the slot as pending until the owner sees the money arrive,
    // for at most depositHoldMin and never past the start time.
    const rules = b.bookingRules!;
    const depositMinor = rules.depositUrl && service.depositMinor ? service.depositMinor : null;
    const depositDueAt = depositMinor ? new Date(Math.min(Date.now() + rules.depositHoldMin * 60_000, startsAt.getTime())) : null;
    const status = depositMinor || !rules.autoConfirm ? 'pending' : 'confirmed';
    const endsAt = slot.end;
    const blockedUntil = new Date(endsAt.getTime() + service.bufferMin * 60_000);

    // The engine said these people are free; the exclusion constraint has the final say.
    for (const staffId of slot.staffIds) {
      try {
        const booking = await this.prisma.booking.create({
          data: {
            id,
            businessId: b.id,
            serviceId: service.id,
            staffId,
            customerId: customer.id,
            status,
            source: 'page',
            startsAt,
            endsAt,
            blockedUntil,
            serviceName: service.name,
            durationMin: service.durationMin,
            priceType: service.priceType,
            priceMinor: service.priceMinor,
            currency: b.currency,
            customerNote: fields.note === 'off' ? null : req.customer.note || null,
            manageTokenHash: hashToken(token),
            confirmedAt: status === 'confirmed' ? new Date() : null,
            depositMinor,
            depositDueAt,
          },
        });
        void this.notifications.dispatch('booking emails', () => this.notifications.bookingCreated(booking.id));
        return { booking: await this.view(booking.id), manageToken: token };
      } catch (error) {
        if (!isSlotTaken(error)) throw error;
      }
    }
    throw new SlotTakenException();
  }

  async getBooking(slug: string, id: string, token: string): Promise<PublicBooking> {
    await this.checkToken(slug, id, token);
    return this.view(id);
  }

  async cancel(slug: string, id: string, token: string): Promise<PublicBooking> {
    const booking = await this.checkToken(slug, id, token);
    if (!isCancellable(booking.status, booking.startsAt)) throw new BadRequestException('This booking can no longer be cancelled');
    await this.prisma.booking.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'Cancelled by customer' },
    });
    void this.notifications.dispatch('cancellation email', () => this.notifications.bookingCancelled(id));
    return this.view(id);
  }

  /**
   * Moves a live booking to another free time, keeping the same person when
   * they're free. The row is updated in place, so the booking's own old time
   * never blocks the new one, and the exclusion constraint still guards races.
   */
  async reschedule(slug: string, id: string, req: RescheduleRequest): Promise<PublicBooking> {
    const checked = await this.checkToken(slug, id, req.token);
    if (!isCancellable(checked.status, checked.startsAt)) throw new BadRequestException('This booking can no longer be changed');
    const current = await this.prisma.booking.findUniqueOrThrow({ where: { id }, select: { serviceId: true, staffId: true, startsAt: true } });

    const b = await this.load(slug);
    const service = b.services.find((s) => s.id === current.serviceId && s.bookable && s.priceType !== 'quote');
    if (!service) throw new BadRequestException('This booking can’t be moved online. Please contact the business.');

    const startsAt = new Date(req.startsAt);
    if (startsAt.getTime() === current.startsAt.getTime() && (!req.staffId || req.staffId === current.staffId)) return this.view(id);
    const { date } = localDate(startsAt, b.timezone);
    const [day] = await this.slots(b, service.id, req.staffId, date, 1, id);
    const slot = day?.slots.find((s) => s.start.getTime() === startsAt.getTime());
    if (!slot) throw new SlotTakenException();

    // Same person if they're free, otherwise whoever the engine offers first.
    const order = [...slot.staffIds].sort((a, c) => Number(c === current.staffId) - Number(a === current.staffId));
    const endsAt = slot.end;
    const blockedUntil = new Date(endsAt.getTime() + service.bufferMin * 60_000);
    for (const staffId of order) {
      try {
        // Conditional on the time we checked, so two tabs can't both move it.
        const moved = await this.prisma.booking.updateMany({
          where: { id, status: { in: [...ACTIVE] }, startsAt: current.startsAt },
          data: { startsAt, endsAt, blockedUntil, staffId, durationMin: service.durationMin, reminderSentAt: null },
        });
        if (moved.count !== 1) throw new BadRequestException('This booking just changed. Please reload and try again.');
        void this.notifications.dispatch('reschedule emails', () => this.notifications.bookingRescheduled(id, current.startsAt));
        return this.view(id);
      } catch (error) {
        if (!isSlotTaken(error)) throw error;
      }
    }
    throw new SlotTakenException();
  }

  async enquire(slug: string, req: EnquiryRequest): Promise<{ ok: true }> {
    const b = await this.load(slug);
    if (req.serviceId && !b.services.some((s) => s.id === req.serviceId)) throw new NotFoundException('Unknown service');
    const phone = this.phone(req.customer.phone, 'optional', b.country);
    const customer = await this.upsertCustomer(b.id, req.customer.name, req.customer.email, phone, false);
    const enquiry = await this.prisma.enquiry.create({
      data: {
        businessId: b.id,
        serviceId: req.serviceId ?? null,
        customerId: customer.id,
        message: req.message,
        preferredDate: req.preferredDate ? new Date(`${req.preferredDate}T00:00:00Z`) : null,
      },
    });
    void this.notifications.dispatch('enquiry email', () => this.notifications.enquiryReceived(enquiry.id));
    return { ok: true };
  }

  // ─── internals ────────────────────────────────────────────────────────────

  private async load(slug: string): Promise<LoadedBusiness> {
    const b = await this.prisma.business.findUnique({ where: { slug }, include: BUSINESS_VIEW });
    if (!b || !b.publishedAt) throw new NotFoundException('No booking page here');
    return b;
  }

  /** Runs the engine for a service (and optionally one person) over a date range, using live bookings. */
  private async slots(b: LoadedBusiness, serviceId: string, staffId: string | undefined, fromDate: string, days: number, excludeBookingId?: string) {
    const service = b.services.find((s) => s.id === serviceId && s.bookable && s.priceType !== 'quote');
    if (!service) throw new NotFoundException('That service can’t be booked online');

    const team = b.staff.filter((s) => s.services.some((l) => l.serviceId === service.id) && (!staffId || s.id === staffId));
    if (staffId && team.length === 0) throw new NotFoundException('That person doesn’t do this service');

    const rules = b.bookingRules!;
    const kind = rules.useOpeningHours ? 'opening' : 'booking';
    const rangeStart = zonedToUtc(fromDate, 0, b.timezone);
    const rangeEnd = zonedToUtc(addDays(fromDate, days), 0, b.timezone);
    const busy = await this.prisma.booking.findMany({
      where: {
        staffId: { in: team.map((s) => s.id) },
        status: { in: [...ACTIVE] },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        startsAt: { lt: rangeEnd },
        blockedUntil: { gt: rangeStart },
      },
      select: { staffId: true, startsAt: true, blockedUntil: true },
    });

    return findSlots({
      now: new Date(),
      timezone: b.timezone,
      minNoticeMin: rules.minNoticeMin,
      windowDays: rules.windowDays,
      slotStepMin: rules.slotStepMin,
      hours: b.hours.filter((h) => h.kind === kind),
      durationMin: service.durationMin,
      bufferMin: service.bufferMin,
      staff: team.map((s) => ({
        id: s.id,
        busy: busy.filter((x) => x.staffId === s.id).map((x) => ({ start: x.startsAt, end: x.blockedUntil })),
      })),
      fromDate,
      days,
    });
  }

  private phone(raw: string | undefined, mode: 'required' | 'optional' | 'off', country: string): string | null {
    if (mode === 'off' || !raw?.trim()) {
      if (mode === 'required') throw new BadRequestException({ message: 'Invalid request', issues: [{ path: 'customer.phone', message: 'Add your phone number' }] });
      return null;
    }
    const parsed = parsePhoneNumberFromString(raw, country as CountryCode);
    if (!parsed?.isValid()) {
      throw new BadRequestException({ message: 'Invalid request', issues: [{ path: 'customer.phone', message: 'Enter a valid phone number' }] });
    }
    return parsed.number;
  }

  private upsertCustomer(businessId: string, name: string, email: string, phone: string | null, consent: boolean) {
    const normalised = email.trim().toLowerCase();
    return this.prisma.customer.upsert({
      where: { businessId_email: { businessId, email: normalised } },
      update: { name, ...(phone ? { phone } : {}), ...(consent ? { remindersConsentAt: new Date() } : {}) },
      create: { businessId, name, email: normalised, phone, remindersConsentAt: consent ? new Date() : null },
    });
  }

  private async checkToken(slug: string, id: string, token: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, business: { slug } },
      select: { id: true, status: true, startsAt: true, manageTokenHash: true },
    });
    const expected = booking?.manageTokenHash;
    const given = hashToken(token);
    if (!booking || !expected || expected.length !== given.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(given))) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  private async view(id: string): Promise<PublicBooking> {
    const b = await this.prisma.booking.findUniqueOrThrow({
      where: { id },
      include: {
        business: { select: { name: true, timezone: true, bookingRules: { select: { depositUrl: true, depositRefundHours: true } } } },
        service: { select: { bookable: true, priceType: true, archivedAt: true } },
        staff: { select: { name: true } },
        customer: { select: { name: true } },
      },
    });
    const cancellable = isCancellable(b.status, b.startsAt);
    return {
      id: b.id,
      status: b.status,
      serviceId: b.serviceId,
      staffId: b.staffId,
      businessName: b.business.name,
      timezone: b.business.timezone,
      serviceName: b.serviceName,
      staffName: b.staff.name,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      priceType: b.priceType,
      priceMinor: b.priceMinor,
      currency: b.currency,
      customerName: b.customer.name,
      cancellable,
      reschedulable: cancellable && b.service.bookable && b.service.priceType !== 'quote' && !b.service.archivedAt,
      deposit:
        b.depositMinor && b.depositDueAt
          ? {
              amountMinor: b.depositMinor,
              payUrl: b.business.bookingRules?.depositUrl ?? null,
              dueAt: b.depositDueAt.toISOString(),
              paid: b.depositPaidAt !== null,
              refundHours: b.business.bookingRules?.depositRefundHours ?? 24,
            }
          : null,
    };
  }
}

const isCancellable = (status: string, startsAt: Date) =>
  (status === 'pending' || status === 'confirmed') && startsAt.getTime() > Date.now();

function toPublic(b: LoadedBusiness, site: ResolvedSite): PublicBusiness {
  const rules = b.bookingRules!;
  const media = mediaSlots(b.media);
  return {
    slug: b.slug,
    name: b.name,
    category: b.category,
    description: b.description,
    locationType: b.locationType,
    addressLine1: b.addressLine1,
    addressLine2: b.addressLine2,
    city: b.city,
    region: b.region,
    postalCode: b.postalCode,
    country: b.country,
    serviceAreas: b.serviceAreas,
    phone: b.phone,
    whatsapp: b.whatsapp,
    email: b.email,
    logo: media.logo,
    hero: media.hero,
    gallery: media.gallery,
    // Customers never see why a fallback happened; the owner app shows the notice.
    site: { ...site, notice: null },
    timezone: b.timezone,
    currency: b.currency,
    hours: b.hours.filter((h) => h.kind === 'opening').map(({ weekday, opensAt, closesAt }) => ({ weekday, opensAt, closesAt })),
    services: b.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      priceType: s.priceType,
      priceMinor: s.priceMinor,
      durationMin: s.durationMin,
      bookable: s.bookable && s.priceType !== 'quote',
      depositMinor: rules.depositUrl ? s.depositMinor : null,
      image: media.forService(s.id),
    })),
    staff: b.staff.map((s) => ({ id: s.id, name: s.name, serviceIds: s.services.map((l) => l.serviceId), photo: media.forStaff(s.id) })),
    faqs: b.faqs,
    booking: {
      windowDays: rules.windowDays,
      customerFields: customerFieldsSchema.parse(rules.customerFields),
      deposits: rules.depositUrl ? { holdMin: rules.depositHoldMin, refundHours: rules.depositRefundHours } : null,
    },
  };
}
