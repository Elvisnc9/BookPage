import { Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CONFIG, type Config } from '../config';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { clearSessionCookie, setSessionCookie } from './cookies';
import { GoogleAuthGuard } from './google-auth.guard';
import { CurrentAuth, SessionGuard } from './session.guard';
import { SessionService, type SessionUser } from './session.service';

/** Reached by browsers as `${APP_ORIGIN}/api/auth/*` through the web app's proxy. */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  /** Redirects to Google's account chooser. */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  google() {
    // The guard has already sent the redirect.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request & { user?: User | null }, @Res() res: Response) {
    if (!req.user) return res.redirect(303, `${this.config.appOrigin}/sign-in?error=google`);

    const { token, expiresAt } = await this.sessions.create(req.user.id, req.headers['user-agent']);
    setSessionCookie(res, this.config, token, expiresAt);
    return res.redirect(303, `${this.config.appOrigin}/`);
  }

  /** Who is signed in, plus the business they're setting up or running. */
  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentAuth() auth: SessionUser) {
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

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const token: unknown = req.cookies?.[this.config.cookie.sessionName];
    if (typeof token === 'string' && token) await this.sessions.revoke(token);
    clearSessionCookie(res, this.config);
    return res.redirect(303, `${this.config.appOrigin}/sign-in`);
  }
}
