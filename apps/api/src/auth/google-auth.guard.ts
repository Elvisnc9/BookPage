import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Starts the Google redirect, and on the callback resolves to the user or null.
 * Null (denied consent, bad state, unverified email) lets the controller send the
 * owner back to the sign-in page instead of showing a raw error.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  override getAuthenticateOptions() {
    return { prompt: 'select_account', session: false };
  }

  override handleRequest<TUser>(_err: unknown, user: TUser | false): TUser | null {
    return user || null;
  }
}
