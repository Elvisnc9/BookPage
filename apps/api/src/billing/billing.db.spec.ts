// Runs against the real database (pnpm test:db): Pro checkout with the development
// test provider, applied exactly once, plus renewal and the plan in effect.
import { randomUUID } from 'node:crypto';
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BillingView, DomainOption } from '@bookpage/shared';
import { AppModule } from '../app.module';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';

class TestSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const userId = req.headers['x-test-user'];
    if (!userId) return false;
    req.auth = { userId, clerkUserId: 'test' };
    return true;
  }
}

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let ownerId: string;
let otherOwnerId: string;

async function call(method: string, path: string, body?: unknown, as = ownerId) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', origin: 'http://localhost:4321', 'x-test-user': as },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => null)) as Record<string, any> | null };
}

const billing = async (as = ownerId) => (await call('GET', '/billing', undefined, as)).json!.billing as BillingView;
const sessionId = (url: string) => new URL(url).searchParams.get('session')!;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideGuard(ClerkAuthGuard).useClass(TestSessionGuard).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  base = await app.getUrl();
  prisma = app.get(PrismaService);
  const make = (name: string) => prisma.user.create({ data: { clerkUserId: `user_test_${randomUUID()}`, email: `test-${randomUUID()}@bookpage.test`, name } });
  ownerId = (await make('Bea Pro')).id;
  otherOwnerId = (await make('Other Owner')).id;
  for (const id of [ownerId, otherOwnerId]) {
    expect((await call('PATCH', '/business', { name: 'Glow', timezone: 'Europe/London', country: 'GB', currency: 'GBP' }, id)).status).toBe(200);
  }
});

afterAll(async () => {
  const businesses = await prisma.business.findMany({ where: { ownerId: { in: [ownerId, otherOwnerId] } }, select: { id: true } });
  await prisma.billingEvent.deleteMany({ where: { businessId: { in: businesses.map((b) => b.id) } } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherOwnerId] } } });
  await app.close();
});

describe('Pro billing (test provider)', () => {
  // A long, made-up name, so the test provider's .com isn't "taken" by the short-name rule.
  const label = `glowtest${randomUUID().slice(0, 8)}`;
  let options: DomainOption[];

  it('starts on the free plan, with the test checkout available', async () => {
    expect(await billing()).toMatchObject({ plan: 'free', effectivePlan: 'free', status: 'none', renewsAt: null, domain: null, checkoutAvailable: true, testMode: true });
  });

  it('suggests domains with prices, marking which are included', async () => {
    const { status, json } = await call('GET', `/billing/domains?query=${encodeURIComponent(`https://www.${label}.com/x`)}`);
    expect(status).toBe(200);
    options = json!.options;
    expect(options.map((o) => o.name)).toContain(`${label}.com`);
    for (const o of options) expect(o.included).toBe(o.available && o.priceMinor! <= 1500);
    // Same search, same answer.
    expect((await call('GET', `/billing/domains?query=${label}`)).json!.options).toEqual(options);
  });

  it('refuses a domain that is taken or costs more than the included one', async () => {
    const taken = options.find((o) => !o.available);
    const pricey = options.find((o) => o.available && !o.included);
    if (taken) expect((await call('POST', '/billing/checkout', { domain: { name: taken.name, mode: 'register' } })).status).toBe(422);
    if (pricey) expect((await call('POST', '/billing/checkout', { domain: { name: pricey.name, mode: 'register' } })).status).toBe(422);
    expect((await call('POST', '/billing/checkout', { domain: { name: 'not a domain', mode: 'register' } })).status).toBe(400);
  });

  it('pays once, turning Pro on for a year with the domain', async () => {
    const pick = options.find((o) => o.included)!;
    expect(pick).toBeTruthy();
    const { status, json } = await call('POST', '/billing/checkout', { domain: { name: pick.name, mode: 'register' } });
    expect(status).toBe(200);
    const id = sessionId(json!.url);
    expect(json!.url).toBe(`http://localhost:4321/billing/test-checkout?session=${id}`);

    expect((await call('GET', `/billing/checkout/${id}`)).json!.session).toMatchObject({ status: 'open', amountMinor: 24900, currency: 'USD', domain: { name: pick.name, mode: 'register' }, testMode: true });
    // Someone else can't see or pay it.
    expect((await call('POST', `/billing/test/${id}/pay`, undefined, otherOwnerId)).status).toBe(404);

    const paid = (await call('POST', `/billing/test/${id}/pay`)).json!.billing as BillingView;
    expect(paid).toMatchObject({ plan: 'pro', effectivePlan: 'pro', status: 'active', domain: { name: pick.name, mode: 'register', status: 'active' } });
    const days = (new Date(paid.renewsAt!).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(364);
    expect(days).toBeLessThan(367);

    // The same payment again changes nothing.
    expect((await call('POST', `/billing/test/${id}/pay`)).json!.billing).toEqual(paid);
    await app.get(BillingService).applyPaid('test', `test_${id}`, id);
    expect(await billing()).toEqual(paid);
    expect(await prisma.billingEvent.count({ where: { provider: 'test', externalId: `test_${id}` } })).toBe(1);

    // Pro unlocks the owner's view too.
    expect((await call('GET', '/business')).json!.business.plan).toBe('pro');
  });

  it('refuses a second checkout while Pro is running', async () => {
    expect((await call('POST', '/billing/checkout', { domain: null })).status).toBe(409);
  });

  it('will not connect a domain another page already uses', async () => {
    const mine = (await billing()).domain!.name;
    expect((await call('POST', '/billing/checkout', { domain: { name: mine, mode: 'connect' } }, otherOwnerId)).status).toBe(422);
  });

  it('cancels and resumes the renewal, keeping Pro for the paid year', async () => {
    expect((await call('POST', '/billing/cancel')).json!.billing).toMatchObject({ status: 'canceling', effectivePlan: 'pro' });
    expect((await call('POST', '/billing/cancel')).status).toBe(409);
    expect((await call('POST', '/billing/resume')).json!.billing).toMatchObject({ status: 'active', effectivePlan: 'pro' });
  });

  it('turns Pro off once the paid year and the grace period are over', async () => {
    await prisma.business.updateMany({ where: { ownerId }, data: { planRenewsAt: new Date(Date.now() - 15 * 86_400_000) } });
    expect(await billing()).toMatchObject({ plan: 'pro', effectivePlan: 'free' });
    expect((await call('GET', '/business')).json!.business.plan).toBe('free');
    await prisma.business.updateMany({ where: { ownerId }, data: { planRenewsAt: new Date(Date.now() - 10 * 86_400_000) } });
    expect((await billing()).effectivePlan).toBe('pro');
  });

  it('adds the domain later when it was skipped at checkout; one you own waits for DNS', async () => {
    expect((await call('POST', '/billing/domain', { domain: { name: `${label}-late.co.uk`, mode: 'connect' } }, otherOwnerId)).status).toBe(409); // not Pro
    const { json } = await call('POST', '/billing/checkout', { domain: null }, otherOwnerId);
    await call('POST', `/billing/test/${sessionId(json!.url)}/pay`, undefined, otherOwnerId);
    expect((await billing(otherOwnerId)).domain).toBeNull();
    const view = (await call('POST', '/billing/domain', { domain: { name: `${label}-own.co.uk`, mode: 'connect' } }, otherOwnerId)).json!.billing as BillingView;
    expect(view.domain).toEqual({ name: `${label}-own.co.uk`, mode: 'connect', status: 'pending' });
    expect((await call('POST', '/billing/domain', { domain: { name: `${label}-two.co.uk`, mode: 'connect' } }, otherOwnerId)).status).toBe(409);
  });
});

describe('launch check', () => {
  it('needs a published page and a known step', async () => {
    expect((await call('GET', '/business/launch-check?step=nope')).status).toBe(400);
    expect((await call('GET', '/business/launch-check?step=search')).status).toBe(409);
  });
});
