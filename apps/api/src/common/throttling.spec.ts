import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { BusinessService } from '../business/business.service';
import { OwnerBookingsService } from '../business/owner-bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { TOO_MANY_ATTEMPTS } from './throttling';

/** Signs requests in as whoever `x-test-user` names (no Clerk, no database). */
class TestSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.auth = { userId: req.headers['x-test-user'], clerkUserId: 'test' };
    return Boolean(req.auth.userId);
  }
}

describe('owner rate limits', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(BusinessService).useValue({ uploadMedia: async () => ({}), get: async () => null })
      .overrideProvider(OwnerBookingsService).useValue({ changeStatus: async () => ({}) })
      .overrideGuard(ClerkAuthGuard).useClass(TestSessionGuard)
      .compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    base = await app.getUrl();
  });
  afterAll(() => app.close());

  const headers = (owner: string) => ({ 'x-test-user': owner, origin: 'http://localhost:4321', 'content-type': 'image/png' });
  const upload = (owner: string) => fetch(`${base}/business/media?kind=hero`, { method: 'POST', headers: headers(owner), body: new Uint8Array([1, 2, 3]) });

  it('caps image uploads per owner, without affecting other owners', async () => {
    for (let i = 0; i < 30; i++) expect((await upload('owner-a')).status).toBe(200);
    const res = await upload('owner-a');
    expect(res.status).toBe(429);
    expect(((await res.json()) as { message: string }).message).toBe(TOO_MANY_ATTEMPTS);
    expect((await upload('owner-b')).status).toBe(200);
  });

  it('caps status changes (they email customers) per owner', async () => {
    const change = () =>
      fetch(`${base}/business/bookings/0190a0b0-0000-7000-8000-000000000001/status`, {
        method: 'POST',
        headers: { ...headers('owner-c'), 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
    for (let i = 0; i < 30; i++) expect((await change()).status).not.toBe(429);
    expect((await change()).status).toBe(429);
  });

  it('keeps ordinary dashboard reads generous', async () => {
    for (let i = 0; i < 60; i++) expect((await fetch(`${base}/business`, { headers: headers('owner-d') })).status).toBe(200);
  });
});
