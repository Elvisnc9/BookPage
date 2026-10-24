import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER } from '../common/client-ip';
import { PrismaService } from '../prisma/prisma.service';
import { TOO_MANY_ATTEMPTS } from '../common/throttling';
import { PublicService } from './public.service';

// HTTP-level rate-limit checks that need no database: the booking service is stubbed.
describe('public endpoint rate limits', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(PublicService)
      .useValue({
        book: async () => ({ ok: true }),
        cancel: async () => ({ ok: true }),
        enquire: async () => ({ ok: true }),
        availability: async () => [],
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    base = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  const body = {
    serviceId: randomUUID(),
    startsAt: '2030-01-07T10:00:00.000Z',
    customer: { name: 'Jo Customer', email: 'jo@example.com' },
    remindersConsent: true,
  };

  // A fresh visitor per test (as the web app forwards it), so one test's counters
  // never spill into another's. The `sends` cap is per visitor across all businesses.
  let n = 0;
  const visitor = () => ({ [CLIENT_IP_HEADER]: `192.0.2.${++n}`, [PROXY_SECRET_HEADER]: 'test-proxy-secret' });

  const book = (slug: string, headers: Record<string, string> = {}) =>
    fetch(`${base}/public/${slug}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  const slug = () => `rl-${randomUUID().slice(0, 8)}`;

  it('answers the 11th booking in a minute from one IP with a 429', async () => {
    const s = slug();
    const me = visitor();
    for (let i = 0; i < 10; i++) expect((await book(s, me)).status).toBe(201);
    const res = await book(s, me);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after-minute')).toBeTruthy();
    expect(((await res.json()) as { message: string }).message).toBe(TOO_MANY_ATTEMPTS);
  });

  it('counts each business separately', async () => {
    const s = slug();
    const me = visitor();
    for (let i = 0; i < 10; i++) await book(s, me);
    expect((await book(s, me)).status).toBe(429);
    expect((await book(slug(), me)).status).toBe(201);
  });

  it('caps what one visitor can send across all businesses at 20 an hour', async () => {
    const me = visitor();
    // Two bookings each at ten businesses: under every per-business limit.
    for (let i = 0; i < 10; i++) {
      const s = slug();
      expect((await book(s, me)).status).toBe(201);
      expect((await book(s, me)).status).toBe(201);
    }
    expect((await book(slug(), me)).status).toBe(429);
    const enquiry = await fetch(`${base}/public/${slug()}/enquiries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...me },
      body: JSON.stringify({ message: 'Hello there', customer: { name: 'Jo', email: 'jo@example.com' } }),
    });
    expect(enquiry.status).toBe(429);
    // Reading pages never uses up the sending allowance, and other visitors are unaffected.
    expect((await fetch(`${base}/public/${slug()}/availability?serviceId=${randomUUID()}`, { headers: me })).status).toBe(200);
    expect((await book(slug(), visitor())).status).toBe(201);
  });

  it('ignores a forwarded IP without the proxy secret', async () => {
    const s = slug();
    for (let i = 0; i < 10; i++) {
      expect((await book(s, { [CLIENT_IP_HEADER]: `203.0.113.${i}` })).status).toBe(201);
    }
    expect((await book(s, { [CLIENT_IP_HEADER]: '203.0.113.99' })).status).toBe(429);
  });

  it('ignores a forwarded IP with a wrong proxy secret', async () => {
    const s = slug();
    for (let i = 0; i < 10; i++) await book(s, { [CLIENT_IP_HEADER]: `198.51.100.${i}`, [PROXY_SECRET_HEADER]: 'guess' });
    expect((await book(s, { [CLIENT_IP_HEADER]: '198.51.100.99', [PROXY_SECRET_HEADER]: 'guess' })).status).toBe(429);
  });

  it('limits by the forwarded IP when the proxy secret matches', async () => {
    const s = slug();
    const me = visitor();
    for (let i = 0; i < 10; i++) expect((await book(s, me)).status).toBe(201);
    expect((await book(s, me)).status).toBe(429);
    // Another visitor behind the same Worker is unaffected.
    expect((await book(s, visitor())).status).toBe(201);
  });

  it('limits cancellations and enquiries too', async () => {
    const s = slug();
    const me = visitor();
    const post = (path: string, payload: unknown) =>
      fetch(`${base}/public/${s}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...me }, body: JSON.stringify(payload) });
    const cancel = () => post(`/bookings/${randomUUID()}/cancel`, { token: 'x'.repeat(32) });
    const enquire = () => post('/enquiries', { message: 'Hello there', customer: { name: 'Jo', email: 'jo@example.com' } });
    const statuses = async (fn: () => Promise<Response>) => {
      const out: number[] = [];
      for (let i = 0; i < 11; i++) out.push((await fn()).status);
      return out;
    };
    // 10 a minute each, then 429 (22 sends in all also passes the hourly cap, which is the point).
    expect((await statuses(cancel)).slice(0, 10).every((x) => x !== 429)).toBe(true);
    expect((await statuses(cancel)).at(-1)).toBe(429);
    expect((await statuses(enquire)).at(-1)).toBe(429);
  });

  it('keeps reads generous', async () => {
    const s = slug();
    const me = visitor();
    for (let i = 0; i < 30; i++) {
      expect((await fetch(`${base}/public/${s}/availability?serviceId=${randomUUID()}`, { headers: me })).status).toBe(200);
    }
  });
});
