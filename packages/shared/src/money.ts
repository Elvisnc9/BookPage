/** Currencies an owner can pick. All have 2 minor digits. */
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** "85" / "85.5" / "85.50" → 8550. Returns null for anything that isn't a plain amount. */
export function toMinor(input: string): number | null {
  const clean = input.trim().replace(/,/g, '');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** 8550 → "85.50", 8500 → "85" (for editing in an input). */
export function fromMinor(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}

/** 8500, 'USD' → "$85"; 8550 → "$85.50". */
export function formatMoney(minor: number, currency: string, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}
