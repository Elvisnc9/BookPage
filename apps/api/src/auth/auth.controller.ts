import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OWNER_LIMITS, OwnerThrottlerGuard } from '../common/throttling';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard, CurrentAuth } from './clerk-auth.guard';
import type { AuthUser } from './owners.service';

/**
 * Reached by browsers as `${APP_ORIGIN}/api/auth/*` through the web app's proxy.
 * Sign-in, sign-out and sessions are Clerk's; this only says who the owner is.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Who is signed in, plus the business they're setting up or running. */
  @Get('me')
  @UseGuards(ClerkAuthGuard, OwnerThrottlerGuard)
  @Throttle(OWNER_LIMITS)
  async me(@CurrentAuth() auth: AuthUser) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        businesses: {
          select: { id: true, slug: true, name: true, onboardingStep: true, publishedAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });
    const { businesses, ...profile } = user;
    return { user: profile, business: businesses[0] ?? null };
  }
}
