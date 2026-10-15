import { type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { CONFIG, type Config } from '../config';

/**
 * Starts the Google redirect, and on the callback resolves to the user or null.
 * Null (denied consent, bad state, unverified email) lets the controller send the
 * owner back to the sign-in page instead of showing a raw error.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  @Inject(CONFIG) private readonly config!: Config;

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    // Local dev without Google keys: say so instead of sending people to a broken Google page.
    if (!this.config.google.configured) {
      context.switchToHttp().getResponse<Response>().redirect(303, `${this.config.appOrigin}/sign-in?error=google_setup`);
      return false;
    }
    return (await super.canActivate(context)) as boolean;
  }

  override getAuthenticateOptions() {
    return { prompt: 'select_account', session: false };
  }

  override handleRequest<TUser>(_err: unknown, user: TUser | false): TUser | null {
    return user || null;
  }
}
