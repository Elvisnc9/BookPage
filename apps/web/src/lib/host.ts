/**
 * Decides which part of the app a request host belongs to.
 *   app host (app.bookpage.app)     → owner app
 *   bookpage.app / www.bookpage.app → marketing
 *   {slug}.bookpage.app             → a business's booking page
 *
 * The app host is configured separately because Google OAuth only accepts
 * plain `localhost` in dev, so there the owner app is `localhost` and
 * marketing is `www.localhost`.
 */
export type Site =
  | { kind: 'marketing' }
  | { kind: 'app' }
  | { kind: 'booking'; slug: string }
  | { kind: 'unknown' };

export function resolveSite(hostname: string, rootDomain: string, appHost = `app.${rootDomain}`): Site {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const root = rootDomain.toLowerCase();

  if (host === appHost.toLowerCase()) return { kind: 'app' };
  if (host === root || host === `www.${root}`) return { kind: 'marketing' };
  if (!host.endsWith(`.${root}`)) return { kind: 'unknown' };

  const sub = host.slice(0, -(root.length + 1));
  if (sub.includes('.') || sub === 'app') return { kind: 'unknown' };
  return { kind: 'booking', slug: sub };
}

/** Internal path prefixes only reachable through a rewrite, never directly. */
export const INTERNAL_PREFIXES = ['/app', '/site'] as const;

export function isInternalPath(pathname: string): boolean {
  return INTERNAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
