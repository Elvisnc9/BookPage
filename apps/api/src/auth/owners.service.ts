import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { CONFIG, type Config } from '../config';
import { PrismaService } from '../prisma/prisma.service';

/** The owner a request acts as, once their Clerk token checks out. */
export interface AuthUser {
  /** Our users.id: every owner query is scoped by it. */
  userId: string;
  clerkUserId: string;
}

/**
 * Maps a Clerk user to our owner record. The first time someone signs in we
 * read their email and name from Clerk and either link the existing owner with
 * that email (the demo and pre-Clerk test accounts) or create a new one.
 * After that it's a single indexed lookup.
 */
@Injectable()
export class OwnersService {
  private readonly clerk;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG) config: Config,
  ) {
    this.clerk = createClerkClient({ secretKey: config.clerk.secretKey });
  }

  async resolve(clerkUserId: string): Promise<AuthUser> {
    const known = await this.prisma.user.findUnique({ where: { clerkUserId }, select: { id: true } });
    if (known) return { userId: known.id, clerkUserId };
    return { userId: await this.firstSignIn(clerkUserId), clerkUserId };
  }

  private async firstSignIn(clerkUserId: string): Promise<string> {
    const profile = await this.clerk.users.getUser(clerkUserId);
    const primary = profile.primaryEmailAddress;
    // Only a verified address may claim an existing owner's account.
    if (!primary || primary.verification?.status !== 'verified') throw new UnauthorizedException('Verify your email address first');
    const email = primary.emailAddress.trim().toLowerCase();
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || null;
    const avatarUrl = profile.hasImage ? profile.imageUrl : null;

    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true, clerkUserId: true } });
    if (existing) {
      // An owner from before Clerk (or the seeded demo): link it, once. Never re-point a linked account.
      if (existing.clerkUserId && existing.clerkUserId !== clerkUserId) throw new UnauthorizedException('This email belongs to another account');
      const linked = await this.prisma.user.updateMany({
        where: { id: existing.id, clerkUserId: null },
        data: { clerkUserId, ...(name ? { name } : {}), ...(avatarUrl ? { avatarUrl } : {}) },
      });
      if (linked.count === 1 || existing.clerkUserId === clerkUserId) return existing.id;
      return (await this.resolve(clerkUserId)).userId; // linked by a parallel request a moment ago
    }
    try {
      return (await this.prisma.user.create({ data: { email, clerkUserId, name, avatarUrl }, select: { id: true } })).id;
    } catch {
      // Two first requests raced; the other one created the row.
      const raced = await this.prisma.user.findUnique({ where: { clerkUserId }, select: { id: true } });
      if (raced) return raced.id;
      throw new UnauthorizedException();
    }
  }
}
