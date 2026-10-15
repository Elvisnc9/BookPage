import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  type BusinessPatch,
  customerFieldsSchema,
  type HoursInput,
  isValidSlug,
  type OwnerBusiness,
  publishIssues,
  type RulesPatch,
  type ServiceInput,
  type StaffInput,
} from '@bookpage/shared';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

/** Mon–Sat 9:00–18:00 until the owner changes it. */
const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: 9 * 60, closesAt: 18 * 60 }));

const OWNER_VIEW = {
  hours: { where: { kind: 'opening' }, orderBy: [{ weekday: 'asc' }, { opensAt: 'asc' }] },
  services: { where: { archivedAt: null }, orderBy: { position: 'asc' } },
  staff: { where: { archivedAt: null }, orderBy: { position: 'asc' } },
  bookingRules: true,
} satisfies Prisma.BusinessInclude;

type BusinessWithView = Prisma.BusinessGetPayload<{ include: typeof OWNER_VIEW }>;

/**
 * The owner's business profile. MVP: one business per owner. Every write is
 * scoped by ownerId, so an owner can never touch another business.
 */
@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async get(ownerId: string): Promise<OwnerBusiness | null> {
    const business = await this.prisma.business.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      include: OWNER_VIEW,
    });
    return business && toOwnerView(business);
  }

  /** Autosaves profile fields, creating the draft business on the first save. */
  async patch(ownerId: string, patch: BusinessPatch): Promise<OwnerBusiness> {
    const existing = await this.prisma.business.findFirst({ where: { ownerId }, select: { id: true, country: true } });
    const data = normalise(patch, patch.country ?? existing?.country ?? 'US');

    if (existing) {
      await this.prisma.business.update({ where: { id: existing.id }, data });
    } else {
      await this.createDraft(ownerId, data);
    }
    return (await this.get(ownerId))!;
  }

  async putHours(ownerId: string, hours: HoursInput): Promise<OwnerBusiness> {
    const id = await this.requireId(ownerId);
    await this.prisma.$transaction([
      this.prisma.openingHours.deleteMany({ where: { businessId: id, kind: 'opening' } }),
      this.prisma.openingHours.createMany({ data: hours.map((h) => ({ ...h, businessId: id, kind: 'opening' as const })) }),
    ]);
    return (await this.get(ownerId))!;
  }

  /**
   * Replaces the service list. Rows with an id are updated, new rows created,
   * and missing rows archived (past bookings still point at them).
   */
  async putServices(ownerId: string, services: ServiceInput[]): Promise<OwnerBusiness> {
    const id = await this.requireId(ownerId);
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.service.findMany({ where: { businessId: id, archivedAt: null }, select: { id: true } });
      const currentIds = new Set(current.map((s) => s.id));
      const keep = new Set<string>();

      for (const [position, { id: serviceId, ...fields }] of services.entries()) {
        const data = { ...fields, description: fields.description ?? null, position };
        if (serviceId && currentIds.has(serviceId)) {
          await tx.service.update({ where: { id: serviceId }, data });
          keep.add(serviceId);
        } else {
          await tx.service.create({ data: { ...data, businessId: id } });
        }
      }
      const removed = [...currentIds].filter((sid) => !keep.has(sid));
      if (removed.length) {
        await tx.service.updateMany({ where: { id: { in: removed } }, data: { archivedAt: new Date() } });
      }
      await relinkStaff(tx, id);
    });
    return (await this.get(ownerId))!;
  }

  async putStaff(ownerId: string, staff: StaffInput): Promise<OwnerBusiness> {
    const id = await this.requireId(ownerId);
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.staff.findMany({ where: { businessId: id, archivedAt: null }, select: { id: true } });
      const currentIds = new Set(current.map((s) => s.id));
      const keep = new Set<string>();

      for (const [position, person] of staff.entries()) {
        if (person.id && currentIds.has(person.id)) {
          await tx.staff.update({ where: { id: person.id }, data: { name: person.name, position } });
          keep.add(person.id);
        } else {
          await tx.staff.create({ data: { businessId: id, name: person.name, position } });
        }
      }
      const removed = [...currentIds].filter((sid) => !keep.has(sid));
      if (removed.length) {
        await tx.staff.updateMany({ where: { id: { in: removed } }, data: { archivedAt: new Date() } });
      }
      await relinkStaff(tx, id);
    });
    return (await this.get(ownerId))!;
  }

  async patchRules(ownerId: string, rules: RulesPatch): Promise<OwnerBusiness> {
    const id = await this.requireId(ownerId);
    await this.prisma.bookingRules.update({ where: { businessId: id }, data: rules });
    return (await this.get(ownerId))!;
  }

  /** Whether `slug` is free for this owner (their own current slug counts as free). */
  async slugAvailable(ownerId: string, slug: string): Promise<boolean> {
    if (!isValidSlug(slug) || slug.startsWith('draft-')) return false;
    const holder = await this.prisma.business.findUnique({ where: { slug }, select: { ownerId: true } });
    return !holder || holder.ownerId === ownerId;
  }

  async publish(ownerId: string, slug: string): Promise<OwnerBusiness> {
    const business = await this.get(ownerId);
    if (!business) throw new NotFoundException('Set up your business first');

    const issues = publishIssues(business);
    if (issues.length) throw new UnprocessableEntityException({ message: 'Not ready to publish', issues });
    if (!(await this.slugAvailable(ownerId, slug))) throw new ConflictException('That address is taken');

    try {
      await this.prisma.business.update({
        where: { id: business.id },
        data: { slug, onboardingStep: 5, publishedAt: business.publishedAt ?? new Date() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('That address is taken');
      }
      throw error;
    }
    return (await this.get(ownerId))!;
  }

  private async createDraft(ownerId: string, data: Prisma.BusinessUpdateInput) {
    const owner = await this.prisma.user.findUniqueOrThrow({ where: { id: ownerId }, select: { name: true } });
    await this.prisma.business.create({
      data: {
        ...(data as Prisma.BusinessCreateWithoutOwnerInput),
        name: typeof data.name === 'string' ? data.name : '',
        // A placeholder until the owner picks their address at publish.
        slug: `draft-${randomBytes(4).toString('hex')}`,
        owner: { connect: { id: ownerId } },
        bookingRules: { create: {} },
        hours: { create: DEFAULT_HOURS },
        staff: { create: { name: owner.name?.split(' ')[0] || 'Me' } },
      },
    });
  }

  private async requireId(ownerId: string): Promise<string> {
    const business = await this.prisma.business.findFirst({ where: { ownerId }, select: { id: true } });
    if (!business) throw new NotFoundException('Set up your business first');
    return business.id;
  }
}

/** MVP staff: everyone does every bookable service. */
async function relinkStaff(tx: Tx, businessId: string) {
  const [staff, services] = await Promise.all([
    tx.staff.findMany({ where: { businessId, archivedAt: null }, select: { id: true } }),
    tx.service.findMany({ where: { businessId, archivedAt: null, bookable: true }, select: { id: true } }),
  ]);
  await tx.staffService.deleteMany({ where: { staff: { businessId } } });
  await tx.staffService.createMany({
    data: staff.flatMap((s) => services.map((svc) => ({ staffId: s.id, serviceId: svc.id }))),
  });
}

/** Phone to E.164 (using the business country), empty strings to null, time zone checked. */
function normalise(patch: BusinessPatch, country: string): Prisma.BusinessUpdateInput {
  const data: Prisma.BusinessUpdateInput = { ...patch };

  if (patch.phone !== undefined) {
    if (!patch.phone) {
      data.phone = null;
    } else {
      const parsed = parsePhoneNumberFromString(patch.phone, country as CountryCode);
      if (!parsed?.isValid()) {
        throw new BadRequestException({ message: 'Invalid request', issues: [{ path: 'phone', message: 'Enter a valid phone number' }] });
      }
      data.phone = parsed.number;
    }
  }
  if (patch.email !== undefined) data.email = patch.email ? patch.email.toLowerCase() : null;
  for (const key of ['description', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode'] as const) {
    if (patch[key] !== undefined) data[key] = patch[key] || null;
  }
  if (patch.timezone !== undefined && !isTimeZone(patch.timezone)) {
    throw new BadRequestException({ message: 'Invalid request', issues: [{ path: 'timezone', message: 'Unknown time zone' }] });
  }
  return data;
}

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function toOwnerView(b: BusinessWithView): OwnerBusiness {
  const rules = b.bookingRules!;
  return {
    id: b.id,
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
    email: b.email,
    timezone: b.timezone,
    currency: b.currency,
    template: b.template,
    onboardingStep: b.onboardingStep,
    publishedAt: b.publishedAt?.toISOString() ?? null,
    hours: b.hours.map(({ weekday, opensAt, closesAt }) => ({ weekday, opensAt, closesAt })),
    services: b.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      priceType: s.priceType,
      priceMinor: s.priceMinor,
      durationMin: s.durationMin,
      bufferMin: s.bufferMin,
      bookable: s.bookable,
    })),
    staff: b.staff.map((s) => ({ id: s.id, name: s.name })),
    rules: {
      minNoticeMin: rules.minNoticeMin,
      windowDays: rules.windowDays,
      autoConfirm: rules.autoConfirm,
      customerFields: customerFieldsSchema.parse(rules.customerFields),
    },
  };
}
