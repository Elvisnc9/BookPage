import { createSign, generateKeyPairSync } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { OwnersService } from './owners.service';

// HTTP-level checks of the Clerk token guard, with no database and no Clerk:
// tokens are signed here with a throwaway key pair whose public half the API trusts.
const APP = 'http://localhost:4321';
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const stranger = generateKeyPairSync('rsa', { modulusLength: 2048 });

function sign(claims: Record<string, unknown>, key = keys.privateKey) {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: 'RS256', typ: 'JWT', kid: 'test' })}.${b64({ iss: 'https://test.clerk.accounts.dev', sub: 'user_123', azp: APP, iat: now, nbf: now - 5, exp: now + 60, sid: 'sess_1', ...claims })}`;
  return `${body}.${createSign('RSA-SHA256').update(body).sign(key, 'base64url')}`;
}

describe('owner authentication (Clerk tokens)', () => {
  let app: INestApplication;
  let base: string;
  const resolved: string[] = [];

  beforeAll(async () => {
    process.env.CLERK_JWT_KEY = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          findUniqueOrThrow: async () => ({ id: 'u1', email: 'maya@example.com', name: 'Maya', avatarUrl: null, businesses: [] }),
        },
      })
      .overrideProvider(OwnersService)
      .useValue({ resolve: async (clerkUserId: string) => (resolved.push(clerkUserId), { userId: 'u1', clerkUserId }) })
      .compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    base = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  const me = (token?: string) => fetch(`${base}/auth/me`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

  it('rejects requests without a token', async () => {
    expect((await me()).status).toBe(401);
    expect((await fetch(`${base}/auth/me`, { headers: { authorization: 'Basic abc' } })).status).toBe(401);
  });

  it('returns the owner for a valid token issued to the owner app', async () => {
    const res = await me(sign({}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: 'u1', email: 'maya@example.com', name: 'Maya', avatarUrl: null }, business: null });
    expect(resolved).toContain('user_123');
  });

  it('rejects a token signed by someone else', async () => {
    expect((await me(sign({}, stranger.privateKey))).status).toBe(401);
  });

  it('rejects a token issued to another site', async () => {
    expect((await me(sign({ azp: 'https://evil.example' }))).status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    expect((await me(sign({ iat: past - 60, nbf: past - 60, exp: past }))).status).toBe(401);
  });

  it('blocks cross-origin writes', async () => {
    const res = await fetch(`${base}/business`, { method: 'PATCH', headers: { origin: 'http://glowstudio.localhost:4321', authorization: `Bearer ${sign({})}` } });
    expect(res.status).toBe(403);
  });
});
