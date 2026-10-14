/**
 * Decides which part of the app a request host belongs to.
 *   bookpage.app / www.bookpage.app → marketing
 *   app.bookpage.app                → owner app
 *   {slug}.bookpage.app             → a business's booking page
 */
export type Site =
  | { kind: 'marketing' }
  | { kind: 'app' }
  | { kind: 'booking'; slug: string }
  | { kind: 'unknown' };

export function resolveSite(hostname: string, rootDomain: string): Site {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const root = rootDomain.toLowerCase();

  if (host === root || host === `www.${root}`) return { kind: 'marketing' };
  if (!host.endsWith(`.${root}`)) return { kind: 'unknown' };

  const sub = host.slice(0, -(root.length + 1));
  if (sub.includes('.')) return { kind: 'unknown' };
  if (sub === 'app') return { kind: 'app' };
  return { kind: 'booking', slug: sub };
}

/** Internal path prefixes only reachable through a rewrite, never directly. */
export const INTERNAL_PREFIXES = ['/app', '/site'] as const;

export function isInternalPath(pathname: string): boolean {
  return INTERNAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
