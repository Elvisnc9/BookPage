// Runs against the real database (pnpm test:db): page-address check and the Pro waitlist.
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;
let base: string;
const email = `wait-${randomUUID().slice(0, 8)}@bookpage.test`;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  base = await app.getUrl();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await prisma.waitlistEntry.deleteMany({ where: { email: { endsWith: '@bookpage.test' } } });
  await app.close();
});

const slug = async (s: string) => (await fetch(`${base}/marketing/slug-available?slug=${s}`)).json();
const join = (body: unknown) =>
  fetch(`${base}/marketing/waitlist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('marketing', () => {
  it('says whether a page address is free', async () => {
    expect(await slug('glowstudio')).toMatchObject({ available: false, valid: true });
    expect(await slug(`free-${randomUUID().slice(0, 6)}`)).toMatchObject({ available: true, valid: true });
    expect(await slug('app')).toMatchObject({ available: false, valid: false });
    expect(await slug('ab')).toMatchObject({ valid: false });
  });

  it('reports real totals of live pages and bookings, without the demo', async () => {
    const res = await fetch(`${base}/marketing/stats`);
    expect(res.status).toBe(200);
    const stats = (await res.json()) as { businesses: number; bookings: number };
    const real = { publishedAt: { not: null }, slug: { notIn: ['glowstudio'] } };
    expect(stats.businesses).toBe(await prisma.business.count({ where: real }));
    expect(stats.bookings).toBe(await prisma.booking.count({ where: { status: { not: 'cancelled' }, business: real } }));
  });

  it('adds people to the Pro waitlist once, case-insensitively', async () => {
    expect((await join({ email })).status).toBe(200);
    expect((await join({ email: email.toUpperCase() })).status).toBe(200);
    expect(await prisma.waitlistEntry.count({ where: { email } })).toBe(1);
  });

  it('rejects things that are not emails', async () => {
    expect((await join({ email: 'nope' })).status).toBe(400);
  });
});
