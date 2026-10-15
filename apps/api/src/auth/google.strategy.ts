import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy, type Profile, type StrategyOptions } from 'passport-google-oauth20';
import { CONFIG, type Config } from '../config';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { clearStateCookie, setStateCookie } from './cookies';

type StateCallback = (err: Error | null, ok?: string | false, info?: unknown) => void;

/**
 * passport-oauth2 keeps `state` in express-session by default. We have no
 * server-side session before sign-in, so the state lives in a short-lived
 * httpOnly cookie and is compared on the way back.
 */
class CookieStateStore {
  constructor(private readonly config: Config) {}

  store(req: Request, _meta: unknown, callback: StateCallback) {
    const state = randomBytes(24).toString('base64url');
    setStateCookie(req.res!, this.config, state);
    callback(null, state);
  }

  verify(req: Request, provided: string, callback: StateCallback) {
    const expected: unknown = req.cookies?.[this.config.cookie.stateName];
    clearStateCookie(req.res!, this.config);
    const ok =
      typeof expected === 'string' &&
      typeof provided === 'string' &&
      expected.length === provided.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
    callback(null, ok ? provided : false, ok ? undefined : { message: 'Invalid OAuth state' });
  }
}

export class UnverifiedEmailError extends Error {}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(CONFIG) config: Config,
    private readonly prisma: PrismaService,
  ) {
    super({
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
      scope: ['openid', 'email', 'profile'],
      // passport-oauth2 picks the call shape by arity (3 = with meta); the typings list every overload.
      store: new CookieStateStore(config) as unknown as StrategyOptions['store'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string | undefined, profile: Profile): Promise<User> {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email || profile._json.email_verified !== true) {
      throw new UnverifiedEmailError('Google account has no verified email');
    }
    const details = { email, name: profile.displayName || null, avatarUrl: profile.photos?.[0]?.value ?? null };
    return this.prisma.user.upsert({
      where: { googleId: profile.id },
      update: details,
      create: { googleId: profile.id, ...details },
    });
  }
}
