/**
 * Runtime settings, read once from the environment.
 *
 * APP_ORIGIN is the owner app (https://app.bookpage.app; http://localhost:4321 in dev).
 * Browsers only ever reach the API through `${APP_ORIGIN}/api/*`, which the web app
 * proxies here, so the session cookie is host-only on the owner app.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function loadConfig() {
  const appOrigin = (process.env.APP_ORIGIN ?? 'http://localhost:4321').replace(/\/$/, '');
  const secure = appOrigin.startsWith('https://');
  const production = process.env.NODE_ENV === 'production';
  // In dev the API starts without Google keys (Google sign-in just won't work), so the UI can be explored first.
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return {
    appOrigin,
    google: {
      configured: production || googleConfigured,
      clientId: production || googleConfigured ? required('GOOGLE_CLIENT_ID') : 'not-configured',
      clientSecret: production || googleConfigured ? required('GOOGLE_CLIENT_SECRET') : 'not-configured',
      callbackUrl: `${appOrigin}/api/auth/google/callback`,
    },
    /** Local-only sign-in without Google (DEV_LOGIN=true). Never available in production. */
    devLogin: !production && process.env.DEV_LOGIN === 'true',
    // Shared with the web app, which sends it alongside the visitor's IP. Without it
    // (or on a mismatch) a forwarded IP is ignored and rate limits key on the socket IP.
    proxySecret: process.env.PROXY_SECRET || null,
    cookie: {
      secure,
      // __Host- makes the browser refuse the cookie unless Secure, Path=/ and no Domain.
      sessionName: secure ? '__Host-bp_session' : 'bp_session',
      stateName: secure ? '__Host-bp_oauth' : 'bp_oauth',
    },
  };
}

export type Config = ReturnType<typeof loadConfig>;
export const CONFIG = Symbol('CONFIG');
