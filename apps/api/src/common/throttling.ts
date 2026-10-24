import { createHash } from 'node:crypto';
import { applyDecorators, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { normalizeIp, Throttle, ThrottlerGuard, type ThrottlerOptions } from '@nestjs/throttler';
import type { Request } from 'express';
import type { AuthUser } from '../auth/owners.service';
import { CONFIG, type Config } from '../config';
import { clientIp } from './client-ip';

// Rate limits for every endpoint that does work on someone's behalf. Counters live in
// memory: fine for one API instance. Move them to Redis before running two.

export const TOO_MANY_ATTEMPTS = 'Too many attempts, try again in a minute.';

/**
 * The named limits. `minute` and `day` count per handler and per tracker (visitor IP
 * and business on public pages, the owner in the dashboard). `sends` counts every
 * request that emails someone, per visitor IP, across all businesses and handlers,
 * so nobody can use BookPage to flood an inbox. It only counts handlers marked
 * with @Sends(): page views never use it up.
 */
export function throttlersFor(config: Config): ThrottlerOptions[] {
  return [
    { name: 'minute', ttl: 60_000, limit: 10 },
    { name: 'day', ttl: 86_400_000, limit: 60 },
    {
      name: 'sends',
      ttl: 3_600_000,
      limit: 20,
      skipIf: (context) => !Reflect.getMetadata(SENDS_KEY, context.getHandler()),
      getTracker: (req) => normalizeIp(clientIp(req as Request, config.proxySecret)),
      generateKey: (_context, tracker) => createHash('sha256').update(`sends|${tracker}`).digest('hex'),
    },
  ];
}

/** Reads on public pages (profile, availability, a booking): generous but bounded. */
export const PUBLIC_READ_LIMITS = { minute: { limit: 120 }, day: { limit: 5_000 } };

const SENDS_KEY = 'bookpage:sends';

/** Marks a handler that emails a customer or a business: at most 20 an hour from one visitor, whatever the business. */
export const Sends = () => applyDecorators(SetMetadata(SENDS_KEY, true), Throttle({ sends: { limit: 20 } }));

/** Images: a booking page loads a dozen at once. */
export const MEDIA_LIMITS = { minute: { limit: 300 }, day: { limit: 20_000 } };

/** The signed-in owner's dashboard and autosave: plenty for real use. */
export const OWNER_LIMITS = { minute: { limit: 120 }, day: { limit: 10_000 } };

/** Image uploads (up to 3 MB each, stored in the database). */
export const UPLOAD_LIMITS = { minute: { limit: 30 }, day: { limit: 200 } };

/** Owner actions that email a customer (approve, decline, cancel…). */
export const OWNER_EMAIL_LIMITS = { minute: { limit: 30 }, day: { limit: 500 } };

/** Owner actions that are rare by nature (publish, checkout, domain, launch checks). */
export const OWNER_RARE_LIMITS = { minute: { limit: 20 }, day: { limit: 300 } };

/**
 * Public (booking page and marketing) endpoints: counted per visitor IP and business
 * slug. Each handler has its own counters (the throttler keys on class + handler + tracker).
 */
@Injectable()
export class PublicThrottlerGuard extends ThrottlerGuard {
  @Inject(CONFIG) private readonly config!: Config;

  protected override async getTracker(req: Request): Promise<string> {
    const slug = String(req.params?.slug ?? '').toLowerCase();
    return `${normalizeIp(clientIp(req, this.config.proxySecret))}|${slug}`;
  }
}

/** Dashboard endpoints: counted per signed-in owner. Must run after ClerkAuthGuard. */
@Injectable()
export class OwnerThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Request & { auth?: AuthUser }): Promise<string> {
    if (!req.auth) throw new Error('OwnerThrottlerGuard must run after ClerkAuthGuard');
    return `owner|${req.auth.userId}`;
  }
}
