import { createHash } from 'node:crypto';

/** SHA-256 of a secret token, for storing it (e.g. a booking's manage link) without keeping the token. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
