import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/** Set by the web app (a Cloudflare Worker) on its server-side calls to the API. */
export const CLIENT_IP_HEADER = 'x-bookpage-client-ip';
export const PROXY_SECRET_HEADER = 'x-bookpage-proxy-secret';

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The visitor's IP. Booking pages call the API from the Worker, so req.ip is the
 * Worker; the visitor's IP arrives in a header, trusted only with the proxy secret.
 */
export function clientIp(req: Request, proxySecret: string | null): string {
  const forwarded = req.headers[CLIENT_IP_HEADER];
  const secret = req.headers[PROXY_SECRET_HEADER];
  if (proxySecret && typeof secret === 'string' && sameSecret(secret, proxySecret) && typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
