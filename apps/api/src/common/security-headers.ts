import type { NextFunction, Request, Response } from 'express';

/**
 * Headers for an API that only ever answers JSON or image bytes: nothing may be
 * framed, sniffed into another type, or run as a page. Handlers can still set
 * their own (images send a sandboxing CSP).
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.set({
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    'cross-origin-resource-policy': 'same-site',
  });
  if (process.env.NODE_ENV === 'production') res.set('strict-transport-security', 'max-age=15552000; includeSubDomains');
  next();
}
