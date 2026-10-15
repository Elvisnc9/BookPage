// Runs against the real database (pnpm test:db).
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { hashToken, SESSION_TTL_MS, SessionService } from './session.service';

const prisma = new PrismaService();
const sessions = new SessionService(prisma);
let userId: string;

beforeAll(async () => {
  userId = (await prisma.user.create({
    data: { googleId: `test-${randomUUID()}`, email: `test-${randomUUID()}@bookpage.test` },
  })).id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }); // cascades to sessions
  await prisma.$disconnect();
});

describe('SessionService', () => {
  it('stores only the hash of the token', async () => {
    const { token } = await sessions.create(userId);
    const row = await prisma.session.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
    expect(row.tokenHash).not.toBe(token);
    expect(await prisma.session.count({ where: { tokenHash: token } })).toBe(0);
  });

  it('validates a fresh token without renewing it', async () => {
    const { token } = await sessions.create(userId);
    const result = await sessions.validate(token);
    expect(result?.userId).toBe(userId);
    expect(result?.renewedUntil).toBeUndefined();
  });

  it('rejects unknown tokens', async () => {
    expect(await sessions.validate('not-a-real-token')).toBeNull();
  });

  it('slides the expiry forward after a day of use', async () => {
    const { token } = await sessions.create(userId);
    const twoDaysLater = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const result = await sessions.validate(token, twoDaysLater);
    expect(result?.renewedUntil?.getTime()).toBe(twoDaysLater.getTime() + SESSION_TTL_MS);
  });

  it('rejects and deletes expired sessions', async () => {
    const { token } = await sessions.create(userId);
    const afterExpiry = new Date(Date.now() + SESSION_TTL_MS + 1000);
    expect(await sessions.validate(token, afterExpiry)).toBeNull();
    expect(await prisma.session.count({ where: { tokenHash: hashToken(token) } })).toBe(0);
  });

  it('revokes a session on sign-out', async () => {
    const { token } = await sessions.create(userId);
    await sessions.revoke(token);
    expect(await sessions.validate(token)).toBeNull();
  });
});
