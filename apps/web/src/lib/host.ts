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

/**
 * The root and app hosts for a request. In development only, a "<a-b-c-d>.nip.io"
 * name stands in for the root domain, so a phone on the same Wi-Fi can open
 * http://10-66-252-254.nip.io:4321 (marketing), glowstudio.10-66-252-254.nip.io:4321
 * (a booking page) and app.10-66-252-254.nip.io:4321 (owner app). nip.io is public DNS
 * that maps such names to that IP. Production always uses the configured domains.
 */
export function domainsFor(hostname: string, rootDomain: string, appHost: string, dev: boolean): { root: string; app: string } {
  const lan = dev ? /(?:^|\.)(\d{1,3}(?:-\d{1,3}){3}\.nip\.io)\.?$/i.exec(hostname) : null;
  if (!lan) return { root: rootDomain, app: appHost };
  const root = lan[1]!.toLowerCase();
  return { root, app: `app.${root}` };
}

/** Internal path prefixes only reachable through a rewrite, never directly. */
export const INTERNAL_PREFIXES = ['/app', '/site'] as const;

export function isInternalPath(pathname: string): boolean {
  return INTERNAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
