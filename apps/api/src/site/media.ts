import { PayloadTooLargeException } from '@nestjs/common';
import type { MEDIA_TYPES, SiteImage } from '@bookpage/shared';
import type { Request } from 'express';
import type { Prisma } from '../generated/prisma/client';

/** Everything about an asset except its bytes, for building page views. */
export const MEDIA_META = {
  select: { id: true, kind: true, serviceId: true, staffId: true, width: true, height: true, position: true },
  orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
} satisfies { select: Prisma.MediaAssetSelect; orderBy: Prisma.MediaAssetOrderByWithRelationInput[] };

export type MediaMeta = Prisma.MediaAssetGetPayload<{ select: typeof MEDIA_META.select }>;

export const toImage = (m: Pick<MediaMeta, 'id' | 'width' | 'height'>): SiteImage => ({
  id: m.id,
  url: `/media/${m.id}`,
  width: m.width,
  height: m.height,
});

/** The page's images, sorted into their slots. */
export function mediaSlots(media: MediaMeta[]) {
  const logo = media.find((m) => m.kind === 'logo');
  const hero = media.find((m) => m.kind === 'hero');
  return {
    logo: logo ? toImage(logo) : null,
    hero: hero ? toImage(hero) : null,
    gallery: media.filter((m) => m.kind === 'gallery').map(toImage),
    forService: (id: string) => {
      const m = media.find((x) => x.kind === 'service' && x.serviceId === id);
      return m ? toImage(m) : null;
    },
    forStaff: (id: string) => {
      const m = media.find((x) => x.kind === 'staff' && x.staffId === id);
      return m ? toImage(m) : null;
    },
  };
}

/** The real type, from the file's first bytes. The Content-Type header is never trusted. */
export function sniffImage(bytes: Buffer): (typeof MEDIA_TYPES)[number] | null {
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}

/** Reads a raw request body (no body parser runs for image types), refusing anything over `limit`. */
export async function readBody(req: Request, limit: number): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body as Buffer;
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > limit) throw new PayloadTooLargeException('That image is too large');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > limit) throw new PayloadTooLargeException('That image is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
