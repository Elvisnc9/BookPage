import { randomBytes, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type BookingRequest,
  type CreatedBooking,
  customerFieldsSchema,
  type EnquiryRequest,
  type PublicBooking,
  type PublicBusiness,
  type PublicDay,
} from '@bookpage/shared';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';
import { hashToken } from '../auth/session.service';
import { findSlots } from '../availability/engine';
import { addDays, isDateString, localDate, zonedToUtc } from '@bookpage/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isSlotTaken } from '../prisma/errors';

const ACTIVE = ['pending', 'confirmed'] as const;
const MAX_DAYS = 31;

const BUSINESS_VIEW = {
  bookingRules: true,
  hours: { orderBy: [{ weekday: 'asc' }, { opensAt: 'asc' }] },
  services: { where: { archivedAt: null }, orderBy: { position: 'asc' } },
  staff: { where: { archivedAt: null }, orderBy: { position: 'asc' }, include: { services: { select: { serviceId: true } } } },
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
  constructor(private readonly prisma: PrismaService) {}

  async profile(slug: string): Promise<PublicBusiness> {
    return toPublic(await this.load(slug));
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

    const manageToken = randomBytes(24).toString('base64url');
    const status = b.bookingRules!.autoConfirm ? 'confirmed' : 'pending';
    const endsAt = slot.end;
    const blockedUntil = new Date(endsAt.getTime() + service.bufferMin * 60_000);

    // The engine said these people are free; the exclusion constraint has the final say.
    for (const staffId of slot.staffIds) {
      try {
        const booking = await this.prisma.booking.create({
          data: {
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
            manageTokenHash: hashToken(manageToken),
            confirmedAt: status === 'confirmed' ? new Date() : null,
          },
        });
        return { booking: await this.view(booking.id), manageToken };
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
    return this.view(id);
  }

  async enquire(slug: string, req: EnquiryRequest): Promise<{ ok: true }> {
    const b = await this.load(slug);
    if (req.serviceId && !b.services.some((s) => s.id === req.serviceId)) throw new NotFoundException('Unknown service');
    const phone = this.phone(req.customer.phone, 'optional', b.country);
    const customer = await this.upsertCustomer(b.id, req.customer.name, req.customer.email, phone, false);
    await this.prisma.enquiry.create({
      data: {
        businessId: b.id,
        serviceId: req.serviceId ?? null,
        customerId: customer.id,
        message: req.message,
        preferredDate: req.preferredDate ? new Date(`${req.preferredDate}T00:00:00Z`) : null,
      },
    });
    return { ok: true };
  }

  // ─── internals ────────────────────────────────────────────────────────────

  private async load(slug: string): Promise<LoadedBusiness> {
    const b = await this.prisma.business.findUnique({ where: { slug }, include: BUSINESS_VIEW });
    if (!b || !b.publishedAt) throw new NotFoundException('No booking page here');
    return b;
  }

  /** Runs the engine for a service (and optionally one person) over a date range, using live bookings. */
  private async slots(b: LoadedBusiness, serviceId: string, staffId: string | undefined, fromDate: string, days: number) {
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
      include: { business: { select: { name: true, timezone: true } }, staff: { select: { name: true } }, customer: { select: { name: true } } },
    });
    return {
      id: b.id,
      status: b.status,
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
      cancellable: isCancellable(b.status, b.startsAt),
    };
  }
}

const isCancellable = (status: string, startsAt: Date) =>
  (status === 'pending' || status === 'confirmed') && startsAt.getTime() > Date.now();

function toPublic(b: LoadedBusiness): PublicBusiness {
  const rules = b.bookingRules!;
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
    logoUrl: b.logoUrl,
    template: b.template,
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
    })),
    staff: b.staff.map((s) => ({ id: s.id, name: s.name, serviceIds: s.services.map((l) => l.serviceId) })),
    booking: { windowDays: rules.windowDays, customerFields: customerFieldsSchema.parse(rules.customerFields) },
  };
}
