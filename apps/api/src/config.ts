/**
 * Runtime settings, read once from the environment.
 *
 * APP_ORIGIN is the owner app (https://app.bookpage.app; http://localhost:4321 in dev).
 * Browsers only ever reach the API through `${APP_ORIGIN}/api/*`, which the web app
 * proxies here. Clerk owns sign-in, cookies and sessions; the web app sends the
 * signed-in owner's Clerk session token as a Bearer token, and the API verifies it.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function loadConfig() {
  const appOrigin = (process.env.APP_ORIGIN ?? 'http://localhost:4321').replace(/\/$/, '');
  return {
    appOrigin,
    clerk: {
      /** Server-side key, used to look up a new owner's email and name. */
      secretKey: required('CLERK_SECRET_KEY'),
      /** PEM public key: session tokens are verified locally, without a call to Clerk. */
      jwtKey: required('CLERK_JWT_KEY').replace(/\\n/g, '\n'),
      /** Only tokens issued to the owner app are accepted (the token's `azp` claim). */
      authorizedParties: [appOrigin],
    },
    // Shared with the web app, which sends it alongside the visitor's IP. Without it
    // (or on a mismatch) a forwarded IP is ignored and rate limits key on the socket IP.
    proxySecret: process.env.PROXY_SECRET || null,
  };
}

export type Config = ReturnType<typeof loadConfig>;
export const CONFIG = Symbol('CONFIG');
