import type { CookieOptions, Response } from 'express';
import type { Config } from '../config';

const base = (config: Config): CookieOptions => ({
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: 'lax', // sent on the top-level redirect back from Google, not on cross-site POSTs
  path: '/',
});

export function setSessionCookie(res: Response, config: Config, token: string, expires: Date) {
  res.cookie(config.cookie.sessionName, token, { ...base(config), expires });
}

export function clearSessionCookie(res: Response, config: Config) {
  res.clearCookie(config.cookie.sessionName, base(config));
}

/** Holds the OAuth `state` for the 10 minutes a Google sign-in can take. */
export function setStateCookie(res: Response, config: Config, state: string) {
  res.cookie(config.cookie.stateName, state, { ...base(config), maxAge: 10 * 60 * 1000 });
}

export function clearStateCookie(res: Response, config: Config) {
  res.clearCookie(config.cookie.stateName, base(config));
}
