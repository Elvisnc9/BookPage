import { describe, expect, it } from 'vitest';
import { businessPatchSchema, publishIssues, publishSchema, serviceSchema } from './business.js';
import { formatMoney, fromMinor, toMinor } from './money.js';
import { formatDuration, formatMinutes } from './time.js';

describe('money', () => {
  it('parses typed amounts into minor units', () => {
    expect(toMinor('85')).toBe(8500);
    expect(toMinor('85.5')).toBe(8550);
    expect(toMinor(' 1,250.99 ')).toBe(125099);
    expect(toMinor('0.1')).toBe(10);
  });

  it('rejects anything that is not a plain amount', () => {
    for (const bad of ['', 'abc', '-5', '1.234', '$5', '1e3']) expect(toMinor(bad)).toBeNull();
  });

  it('round-trips for editing and formats for display', () => {
    expect(fromMinor(8500)).toBe('85');
    expect(fromMinor(8550)).toBe('85.50');
    expect(formatMoney(8500, 'USD')).toBe('$85');
    expect(formatMoney(8550, 'EUR', 'en-IE')).toBe('€85.50');
  });
});

describe('time', () => {
  it('formats minutes of the day and durations', () => {
    expect(formatMinutes(570)).toBe('9:30 AM');
    expect(formatMinutes(1080)).toBe('6:00 PM');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(120)).toBe('2 h');
  });
});

describe('serviceSchema', () => {
  const base = { name: 'Cut', priceType: 'fixed', priceMinor: 3000, durationMin: 30, bookable: true } as const;

  it('accepts a priced, bookable service', () => {
    expect(serviceSchema.safeParse(base).success).toBe(true);
  });

  it('requires an amount for fixed and from prices only', () => {
    expect(serviceSchema.safeParse({ ...base, priceMinor: null }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...base, priceType: 'free', priceMinor: 0 }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...base, priceType: 'free', priceMinor: null }).success).toBe(true);
  });

  it('never lets a quote-only service be booked', () => {
    expect(serviceSchema.safeParse({ ...base, priceType: 'quote', priceMinor: null }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...base, priceType: 'quote', priceMinor: null, bookable: false }).success).toBe(true);
  });
});

describe('businessPatchSchema', () => {
  it('accepts partial drafts and rejects unknown fields', () => {
    expect(businessPatchSchema.safeParse({ name: 'Glow' }).success).toBe(true);
    expect(businessPatchSchema.safeParse({ slug: 'sneaky' }).success).toBe(false);
    expect(businessPatchSchema.safeParse({ publishedAt: '2026-01-01' }).success).toBe(false);
  });

  it('allows clearing the contact email', () => {
    expect(businessPatchSchema.safeParse({ email: '' }).success).toBe(true);
    expect(businessPatchSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});

describe('publishSchema', () => {
  it('normalises and validates the chosen address', () => {
    expect(publishSchema.parse({ slug: ' GlowStudio ' }).slug).toBe('glowstudio');
    expect(publishSchema.safeParse({ slug: 'app' }).success).toBe(false);
    expect(publishSchema.safeParse({ slug: 'draft-1234abcd' }).success).toBe(false);
    expect(publishSchema.safeParse({ slug: 'glow--studio' }).success).toBe(false);
  });
});

describe('publishIssues', () => {
  const ready = {
    name: 'Glow Studio',
    category: 'hair_salon',
    locationType: 'premises' as const,
    addressLine1: '214 Bedford Ave',
    city: 'Brooklyn',
    serviceAreas: [],
    phone: '+17185550142',
    hours: [{ weekday: 2, opensAt: 600, closesAt: 1140 }],
    services: [{ id: 'x', name: 'Cut', priceType: 'fixed' as const, priceMinor: 3000, durationMin: 30, bufferMin: 0, bookable: true }],
    staff: [{ id: 's', name: 'Maya' }],
  };

  it('is empty for a complete profile', () => {
    expect(publishIssues(ready)).toEqual([]);
  });

  it('asks for an address only when customers come to you', () => {
    expect(publishIssues({ ...ready, addressLine1: null })).toHaveLength(1);
    expect(publishIssues({ ...ready, addressLine1: null, locationType: 'online' })).toEqual([]);
    expect(publishIssues({ ...ready, locationType: 'mobile' })[0]?.message).toMatch(/areas/);
  });
});
