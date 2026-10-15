import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

// HTTP-level checks that need no database: the session lookup is stubbed.
describe('auth routes', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(SessionService)
      .useValue({ validate: async () => null, revoke: async () => undefined })
      .compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.listen(0);
    base = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('starts Google sign-in with a state cookie', async () => {
    const res = await fetch(`${base}/auth/google`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.searchParams.get('redirect_uri')).toBe('http://localhost:4321/api/auth/google/callback');
    expect(location.searchParams.get('prompt')).toBe('select_account');

    const state = location.searchParams.get('state');
    expect(state).toBeTruthy();
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('bp_oauth='));
    expect(cookie).toContain(`bp_oauth=${state}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('sends a callback with a forged state back to sign-in', async () => {
    const res = await fetch(`${base}/auth/google/callback?code=x&state=forged`, {
      redirect: 'manual',
      headers: { cookie: 'bp_oauth=expected-state-value' },
    });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:4321/sign-in?error=google');
  });

  it('rejects /auth/me without a valid session', async () => {
    expect((await fetch(`${base}/auth/me`)).status).toBe(401);
    expect((await fetch(`${base}/auth/me`, { headers: { cookie: 'bp_session=nope' } })).status).toBe(401);
  });

  it('blocks cross-origin writes', async () => {
    const res = await fetch(`${base}/auth/logout`, {
      method: 'POST',
      redirect: 'manual',
      headers: { origin: 'http://glowstudio.localhost:4321' },
    });
    expect(res.status).toBe(403);
  });

  it('signs out from the app origin and clears the cookie', async () => {
    const res = await fetch(`${base}/auth/logout`, {
      method: 'POST',
      redirect: 'manual',
      headers: { origin: 'http://localhost:4321', cookie: 'bp_session=abc' },
    });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:4321/sign-in');
    expect(res.headers.getSetCookie().join()).toMatch(/bp_session=;/);
  });
});
