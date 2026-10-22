// Runs against the real database (pnpm test:db): linking Clerk users to owners.
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { OwnersService } from './owners.service';

let app: INestApplication;
let prisma: PrismaService;
let owners: OwnersService;
const created: string[] = [];

/** What Clerk would return for a user; only the fields OwnersService reads. */
const profiles = new Map<string, { email: string; verified: boolean; first?: string }>();
const fakeClerk = {
  users: {
    getUser: async (id: string) => {
      const p = profiles.get(id)!;
      return {
        primaryEmailAddress: { emailAddress: p.email, verification: { status: p.verified ? 'verified' : 'unverified' } },
        firstName: p.first ?? null,
        lastName: null,
        hasImage: false,
        imageUrl: '',
      };
    },
  },
};

const clerkUser = (email: string, verified = true, first?: string) => {
  const id = `user_${randomUUID()}`;
  profiles.set(id, { email, verified, ...(first ? { first } : {}) });
  return id;
};
const email = () => `owner-${randomUUID().slice(0, 8)}@BookPage.test`;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
  prisma = app.get(PrismaService);
  owners = app.get(OwnersService);
  (owners as unknown as { clerk: typeof fakeClerk }).clerk = fakeClerk;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: created } } });
  await app.close();
});

describe('Clerk users and owners', () => {
  it('creates an owner on first sign-in, then finds them by Clerk id', async () => {
    const id = clerkUser(email(), true, 'Maya');
    const first = await owners.resolve(id);
    created.push(first.userId);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: first.userId } });
    expect(row).toMatchObject({ clerkUserId: id, name: 'Maya' });
    expect(row.email).toBe(row.email.toLowerCase());
    expect((await owners.resolve(id)).userId).toBe(first.userId);
  });

  it('links an existing owner with the same email (the demo or a pre-Clerk account)', async () => {
    const address = email();
    const existing = await prisma.user.create({ data: { email: address.toLowerCase(), name: 'Old' } });
    created.push(existing.id);
    const id = clerkUser(address);
    expect((await owners.resolve(id)).userId).toBe(existing.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: existing.id } })).clerkUserId).toBe(id);
  });

  it('never moves an account already linked to another Clerk user', async () => {
    const address = email();
    const mine = await owners.resolve(clerkUser(address));
    created.push(mine.userId);
    await expect(owners.resolve(clerkUser(address))).rejects.toThrow(/another account/);
  });

  it('refuses unverified email addresses', async () => {
    await expect(owners.resolve(clerkUser(email(), false))).rejects.toThrow(/Verify your email/);
  });
});
