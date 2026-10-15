import { Inject, Injectable } from '@nestjs/common';
import { normalizeIp, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { clientIp } from '../common/client-ip';
import { CONFIG, type Config } from '../config';

export const TOO_MANY_ATTEMPTS = 'Too many attempts, try again in a minute.';

/** Write limits per visitor IP, per business: a burst limit and a daily cap. */
export const PUBLIC_THROTTLERS = [
  { name: 'minute', ttl: 60_000, limit: 10 },
  { name: 'day', ttl: 86_400_000, limit: 60 },
];

/** Reads (profile, availability, a booking) are generous but still bounded. */
export const PUBLIC_READ_LIMITS = { minute: { limit: 120 }, day: { limit: 5_000 } };

/**
 * Rate limits the booking-page endpoints by visitor IP and business slug. Each
 * handler has its own counters (the throttler keys on class + handler + tracker).
 */
@Injectable()
export class PublicThrottlerGuard extends ThrottlerGuard {
  @Inject(CONFIG) private readonly config!: Config;

  protected override async getTracker(req: Request): Promise<string> {
    const slug = String(req.params?.slug ?? '').toLowerCase();
    return `${normalizeIp(clientIp(req, this.config.proxySecret))}|${slug}`;
  }
}
