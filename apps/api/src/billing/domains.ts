import { createHash } from 'node:crypto';
import { type DomainOption, INCLUDED_DOMAIN_MAX_MINOR } from '@bookpage/shared';

/**
 * Domain search for the upgrade page. The real registrar (bought after payment, in the
 * owner's name) plugs in behind this interface; until then development uses
 * `testDomains`: made-up availability and typical first-year prices, nothing registered.
 */
export interface DomainProvider {
  search(query: string): Promise<DomainOption[]>;
}

/** Extensions offered, with a typical first-year price in USD cents. */
const TLDS: [tld: string, priceMinor: number][] = [
  ['com', 1_100],
  ['co', 2_900],
  ['net', 1_300],
  ['studio', 2_400],
  ['co.uk', 900],
  ['shop', 300],
];

/** "Glow Studio!" → "glowstudio"; "https://www.glow.com/x" → "glow". */
export function domainLabel(query: string): string {
  const host = query.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0]!;
  const first = host.includes('.') ? host.split('.')[0]! : host;
  return first.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 63);
}

export const testDomains: DomainProvider = {
  async search(query) {
    const label = domainLabel(query);
    if (label.length < 2) return [];
    return TLDS.map(([tld, priceMinor]) => {
      const name = `${label}.${tld}`;
      // Deterministic, so the same search always answers the same: about a third are "taken",
      // and every short .com is (as in real life).
      const taken = createHash('sha256').update(name).digest()[0]! % 3 === 0 || (tld === 'com' && label.length <= 5);
      return { name, available: !taken, priceMinor: taken ? null : priceMinor, included: !taken && priceMinor <= INCLUDED_DOMAIN_MAX_MINOR };
    });
  },
};
