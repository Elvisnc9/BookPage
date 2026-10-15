import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Sliding expiry is only written back once a day, not on every request. */
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export interface SessionUser {
  sessionId: string;
  userId: string;
  /** Set when the expiry slid forward, so the cookie should be re-issued. */
  renewedUntil?: Date;
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the raw token for the cookie; only its hash is stored. */
  async create(userId: string, userAgent?: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.session.create({
      data: { tokenHash: hashToken(token), userId, expiresAt, userAgent: userAgent?.slice(0, 255) },
    });
    return { token, expiresAt };
  }

  async validate(token: string, now = new Date()): Promise<SessionUser | null> {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!session) return null;
    if (session.expiresAt <= now) {
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }
    if (now.getTime() - session.lastSeenAt.getTime() > REFRESH_AFTER_MS) {
      const renewedUntil = new Date(now.getTime() + SESSION_TTL_MS);
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: now, expiresAt: renewedUntil },
      });
      return { sessionId: session.id, userId: session.userId, renewedUntil };
    }
    return { sessionId: session.id, userId: session.userId };
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
}
