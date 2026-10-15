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
  return {
    appOrigin,
    google: {
      clientId: required('GOOGLE_CLIENT_ID'),
      clientSecret: required('GOOGLE_CLIENT_SECRET'),
      callbackUrl: `${appOrigin}/api/auth/google/callback`,
    },
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
