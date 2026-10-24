import { describe, expect, it } from 'vitest';
import { checkoutRequestSchema, domainNameSchema, effectivePlan, PRO_GRACE_DAYS } from './billing.js';

describe('effectivePlan', () => {
  const now = new Date('2030-06-01T12:00:00Z');
  const day = 86_400_000;

  it('keeps Pro through the paid year and the grace period, then drops to free', () => {
    expect(effectivePlan({ plan: 'pro', planRenewsAt: new Date(now.getTime() + 10 * day) }, now)).toBe('pro');
    expect(effectivePlan({ plan: 'pro', planRenewsAt: new Date(now.getTime() - (PRO_GRACE_DAYS - 1) * day) }, now)).toBe('pro');
    expect(effectivePlan({ plan: 'pro', planRenewsAt: new Date(now.getTime() - (PRO_GRACE_DAYS + 1) * day) }, now)).toBe('free');
  });

  it('treats a hand-set Pro (no renewal date) as Pro, and free as free', () => {
    expect(effectivePlan({ plan: 'pro', planRenewsAt: null }, now)).toBe('pro');
    expect(effectivePlan({ plan: 'free', planRenewsAt: new Date(now.getTime() + day) }, now)).toBe('free');
  });
});

describe('domain names', () => {
  it('accepts ordinary domains and normalises case', () => {
    expect(domainNameSchema.parse(' GlowStudio.com ')).toBe('glowstudio.com');
    expect(domainNameSchema.safeParse('glow-studio.co.uk').success).toBe(true);
  });

  it('refuses schemes, paths, bare words and bad hyphens', () => {
    for (const bad of ['https://glow.com', 'glow.com/book', 'glowstudio', '-glow.com', 'glow-.com', 'a b.com']) {
      expect(domainNameSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('checkout takes a domain choice or none', () => {
    expect(checkoutRequestSchema.safeParse({ domain: null }).success).toBe(true);
    expect(checkoutRequestSchema.safeParse({ domain: { name: 'glow.com', mode: 'register' } }).success).toBe(true);
    expect(checkoutRequestSchema.safeParse({ domain: { name: 'glow.com', mode: 'steal' } }).success).toBe(false);
  });
});
