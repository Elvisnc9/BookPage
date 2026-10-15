import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CONFIG, type Config } from '../config';
import { setSessionCookie } from './cookies';
import { SessionService, type SessionUser } from './session.service';

type AuthedRequest = Request & { auth?: SessionUser };

/** Requires a valid session cookie; puts { sessionId, userId } on the request. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<AuthedRequest>();
    const token: unknown = req.cookies?.[this.config.cookie.sessionName];
    if (typeof token !== 'string' || !token) throw new UnauthorizedException();

    const auth = await this.sessions.validate(token);
    if (!auth) throw new UnauthorizedException();

    if (auth.renewedUntil) setSessionCookie(http.getResponse<Response>(), this.config, token, auth.renewedUntil);
    req.auth = auth;
    return true;
  }
}

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => context.switchToHttp().getRequest<AuthedRequest>().auth!,
);
