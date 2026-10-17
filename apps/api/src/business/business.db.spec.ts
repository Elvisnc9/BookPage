// Runs against the real database (pnpm test:db): the onboarding autosave flow over HTTP.
import { randomUUID } from 'node:crypto';
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { OwnerBusiness } from '@bookpage/shared';
import { AppModule } from '../app.module';
import { SessionGuard } from '../auth/session.guard';
import { PrismaService } from '../prisma/prisma.service';

/** Signs requests in as whoever `x-test-user` names. */
class TestSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const userId = req.headers['x-test-user'];
    if (!userId) return false;
    req.auth = { sessionId: 'test', userId };
    return true;
  }
}

const ORIGIN = 'http://localhost:4321';
let app: INestApplication;
let prisma: PrismaService;
let base: string;
let ownerId: string;
let otherOwnerId: string;

async function call(method: string, path: string, body?: unknown, as = ownerId) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-test-user': as },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: res.status, json };
}

const asBusiness = (json: unknown) => json as OwnerBusiness;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(SessionGuard)
    .useClass(TestSessionGuard)
    .compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  await app.listen(0);
  base = await app.getUrl();
  prisma = app.get(PrismaService);

  const make = (name: string) =>
    prisma.user.create({ data: { googleId: `test-${randomUUID()}`, email: `test-${randomUUID()}@bookpage.test`, name } });
  ownerId = (await make('Ava Stone')).id;
  otherOwnerId = (await make('Other Owner')).id;
});

afterAll(async () => {
  for (const id of [ownerId, otherOwnerId]) {
    await prisma.booking.deleteMany({ where: { business: { ownerId: id } } });
    await prisma.user.deleteMany({ where: { id } }); // cascades to businesses and their rows
  }
  await app.close();
});

describe('onboarding autosave', () => {
  it('has no business before the first save', async () => {
    const { status, json } = await call('GET', '/business');
    expect(status).toBe(200);
    expect(json).toEqual({ business: null });
  });

  it('creates a draft with defaults on the first save', async () => {
    const { status, json } = await call('PATCH', '/business', {
      timezone: 'Europe/London',
      country: 'GB',
      currency: 'GBP',
    });
    expect(status).toBe(200);
    const b = asBusiness(json);
    expect(b.slug).toMatch(/^draft-[0-9a-f]{8}$/);
    expect(b.publishedAt).toBeNull();
    expect(b.staff).toEqual([{ id: expect.any(String), name: 'Ava', photo: null }]);
    expect(b.hours).toHaveLength(6);
    expect(b.rules.customerFields).toEqual({ phone: 'required', note: 'optional' });
  });

  it('normalises the phone number with the business country', async () => {
    const { json } = await call('PATCH', '/business', { name: 'Stone & Co', phone: '020 7946 0958', email: 'Hi@Stone.example' });
    expect(asBusiness(json).phone).toBe('+442079460958');
    expect(asBusiness(json).email).toBe('hi@stone.example');
  });

  it('reports field problems instead of saving them', async () => {
    const bad = await call('PATCH', '/business', { phone: '12' });
    expect(bad.status).toBe(400);
    expect(bad.json?.issues).toEqual([{ path: 'phone', message: 'Enter a valid phone number' }]);

    const unknown = await call('PATCH', '/business', { slug: 'sneaky' });
    expect(unknown.status).toBe(400);
  });

  it('replaces services, keeping ids and archiving removed ones', async () => {
    const first = asBusiness(
      (await call('PUT', '/business/services', [
        { name: 'Cut', priceType: 'fixed', priceMinor: 3000, durationMin: 30, bookable: true },
        { name: 'Colour', priceType: 'from', priceMinor: 9000, durationMin: 120, bookable: true },
      ])).json,
    );
    expect(first.services.map((s) => s.name)).toEqual(['Cut', 'Colour']);
    const [cut] = first.services;

    const second = asBusiness(
      (await call('PUT', '/business/services', [
        { id: cut!.id, name: 'Haircut', priceType: 'fixed', priceMinor: 3500, durationMin: 30, bookable: true },
        { name: 'Bridal', priceType: 'quote', priceMinor: null, durationMin: 180, bookable: false },
      ])).json,
    );
    expect(second.services.map((s) => s.name)).toEqual(['Haircut', 'Bridal']);
    expect(second.services[0]!.id).toBe(cut!.id);

    const archived = await prisma.service.count({ where: { businessId: second.id, archivedAt: { not: null } } });
    expect(archived).toBe(1);

    // The only staff member is linked to the one bookable service.
    const links = await prisma.staffService.findMany({ where: { staff: { businessId: second.id } } });
    expect(links.map((l) => l.serviceId)).toEqual([cut!.id]);
  });

  it('rejects a bookable quote-only service', async () => {
    const { status } = await call('PUT', '/business/services', [
      { name: 'Bridal', priceType: 'quote', priceMinor: null, durationMin: 180, bookable: true },
    ]);
    expect(status).toBe(400);
  });

  it('saves hours, team and booking rules', async () => {
    await call('PUT', '/business/hours', [{ weekday: 1, opensAt: 600, closesAt: 1020 }]);
    const staff = asBusiness((await call('PUT', '/business/staff', [{ name: 'Ava' }, { name: 'Ben' }])).json);
    const rules = asBusiness(
      (await call('PATCH', '/business/rules', { minNoticeMin: 60, autoConfirm: false, customerFields: { phone: 'optional', note: 'off' } })).json,
    );
    expect(staff.staff.map((s) => s.name)).toEqual(['Ava', 'Ben']);
    expect(rules.hours).toEqual([{ weekday: 1, opensAt: 600, closesAt: 1020 }]);
    expect(rules.rules).toMatchObject({ minNoticeMin: 60, autoConfirm: false, customerFields: { phone: 'optional', note: 'off' } });
  });

  it('refuses to publish until the profile is complete', async () => {
    const { status, json } = await call('POST', '/business/publish', { slug: `stone-${randomUUID().slice(0, 6)}` });
    expect(status).toBe(422);
    expect(json?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Pick a category' })]),
    );
  });

  it('publishes on a free address and rejects taken or reserved ones', async () => {
    await call('PATCH', '/business', {
      category: 'hair_salon',
      locationType: 'premises',
      addressLine1: '1 Test Street',
      city: 'London',
    });

    expect((await call('GET', '/business/slug-available?slug=glowstudio')).json).toMatchObject({ available: false });
    expect((await call('GET', '/business/slug-available?slug=app')).json).toMatchObject({ available: false });
    expect((await call('POST', '/business/publish', { slug: 'glowstudio' })).status).toBe(409);

    const slug = `stone-${randomUUID().slice(0, 6)}`;
    expect((await call('GET', `/business/slug-available?slug=${slug}`)).json).toMatchObject({ available: true });
    const { status, json } = await call('POST', '/business/publish', { slug });
    expect(status).toBe(200);
    expect(asBusiness(json)).toMatchObject({ slug, onboardingStep: 5, publishedAt: expect.any(String) });

    // Your own address stays "available" to you.
    expect((await call('GET', `/business/slug-available?slug=${slug}`)).json).toMatchObject({ available: true });
    expect((await call('GET', `/business/slug-available?slug=${slug}`, undefined, otherOwnerId)).json).toMatchObject({ available: false });
  });

  it("never touches another owner's business", async () => {
    const { json } = await call('GET', '/business', undefined, otherOwnerId);
    expect(json).toEqual({ business: null });
    expect((await call('PUT', '/business/hours', [], otherOwnerId)).status).toBe(404);
  });
});
