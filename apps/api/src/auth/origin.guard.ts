import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { CONFIG, type Config } from '../config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-authenticated writes: any state-changing request must
 * come from the owner app's own origin. SameSite=Lax already blocks most
 * cross-site POSTs; this also covers same-site ones (e.g. from a booking subdomain).
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(@Inject(CONFIG) private readonly config: Config) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    // Booking-page endpoints carry no cookie, so there is no session to forge.
    // The web app calls them server-side, without an Origin header.
    if (req.path.startsWith('/public/')) return true;
    if (req.headers.origin === this.config.appOrigin) return true;
    throw new ForbiddenException('Cross-origin request blocked');
  }
}
