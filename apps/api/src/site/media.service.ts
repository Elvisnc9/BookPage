import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GALLERY_MAX, MEDIA_KINDS, type MediaKind } from '@bookpage/shared';
import { PrismaService } from '../prisma/prisma.service';
import { sniffImage } from './media';

export interface UploadInput {
  kind: string;
  targetId?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  bytes: Buffer;
}

/**
 * Owner uploads, stored in Postgres until object storage exists. Logo, cover,
 * service and team photos have one slot each: a new upload replaces the old one.
 */
@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(businessId: string, input: UploadInput): Promise<string> {
    if (!(MEDIA_KINDS as readonly string[]).includes(input.kind)) throw bad('kind', 'Unknown image slot');
    const kind = input.kind as MediaKind;
    const contentType = sniffImage(input.bytes);
    if (!contentType) throw bad('file', 'Use a JPG, PNG or WebP image');

    const dims = (n: number | undefined) => (n && Number.isInteger(n) && n > 0 && n <= 10_000 ? n : null);
    const data = {
      businessId,
      kind,
      contentType,
      width: dims(input.width),
      height: dims(input.height),
      byteSize: input.bytes.length,
      data: new Uint8Array(input.bytes),
    };

    return this.prisma.$transaction(async (tx) => {
      if (kind === 'logo' || kind === 'hero') {
        await tx.mediaAsset.deleteMany({ where: { businessId, kind } });
        return (await tx.mediaAsset.create({ data, select: { id: true } })).id;
      }
      if (kind === 'service') {
        const service = input.targetId
          ? await tx.service.findFirst({ where: { id: input.targetId, businessId, archivedAt: null }, select: { id: true } })
          : null;
        if (!service) throw bad('targetId', 'Save the service before adding its photo');
        await tx.mediaAsset.deleteMany({ where: { businessId, kind, serviceId: service.id } });
        return (await tx.mediaAsset.create({ data: { ...data, serviceId: service.id }, select: { id: true } })).id;
      }
      if (kind === 'staff') {
        const person = input.targetId
          ? await tx.staff.findFirst({ where: { id: input.targetId, businessId, archivedAt: null }, select: { id: true } })
          : null;
        if (!person) throw bad('targetId', 'Save this person before adding their photo');
        await tx.mediaAsset.deleteMany({ where: { businessId, kind, staffId: person.id } });
        return (await tx.mediaAsset.create({ data: { ...data, staffId: person.id }, select: { id: true } })).id;
      }
      const existing = await tx.mediaAsset.aggregate({ where: { businessId, kind: 'gallery' }, _count: true, _max: { position: true } });
      if (existing._count >= GALLERY_MAX) throw new ConflictException(`The gallery holds ${GALLERY_MAX} photos. Remove one first.`);
      return (await tx.mediaAsset.create({ data: { ...data, position: (existing._max.position ?? -1) + 1 }, select: { id: true } })).id;
    });
  }

  async remove(businessId: string, id: string): Promise<void> {
    const { count } = await this.prisma.mediaAsset.deleteMany({ where: { id, businessId } });
    if (!count) throw new NotFoundException('That image was already removed');
  }

  /** Bytes for /media/{id}. Every stored asset belongs to a business, so every id is servable. */
  read(id: string) {
    return this.prisma.mediaAsset.findUnique({ where: { id }, select: { data: true, contentType: true, byteSize: true } });
  }
}

const bad = (path: string, message: string) => new BadRequestException({ message, issues: [{ path, message }] });
