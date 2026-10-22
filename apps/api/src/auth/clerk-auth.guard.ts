import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import type { Request } from 'express';
import { CONFIG, type Config } from '../config';
import { type AuthUser, OwnersService } from './owners.service';

type AuthedRequest = Request & { auth?: AuthUser };

/**
 * Requires a Clerk session token as `Authorization: Bearer …` (the web app adds
 * it when proxying). Verified locally with the instance's public key, and only
 * accepted if it was issued to the owner app. Puts { userId, clerkUserId } on the request.
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly owners: OwnersService,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException();

    let clerkUserId: string;
    try {
      const claims = await verifyToken(token, { jwtKey: this.config.clerk.jwtKey, authorizedParties: this.config.clerk.authorizedParties });
      clerkUserId = claims.sub;
    } catch {
      throw new UnauthorizedException();
    }
    req.auth = await this.owners.resolve(clerkUserId);
    return true;
  }
}

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => context.switchToHttp().getRequest<AuthedRequest>().auth!,
);
