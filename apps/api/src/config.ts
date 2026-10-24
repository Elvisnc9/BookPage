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

/**
 * In production every one of these must be set: without them emails would link to
 * localhost, not be sent at all, or be signed with the development secret. Refusing
 * to start is safer than running half-configured.
 */
const REQUIRED_IN_PRODUCTION = ['APP_ORIGIN', 'PAGE_URL_TEMPLATE', 'EMAIL_FROM', 'RESEND_API_KEY', 'MANAGE_TOKEN_SECRET', 'PROXY_SECRET', 'DATABASE_URL'];

function checkProduction() {
  if (process.env.NODE_ENV !== 'production') return;
  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing environment variables for production: ${missing.join(', ')}`);
  for (const name of ['APP_ORIGIN', 'PAGE_URL_TEMPLATE']) {
    if (!process.env[name]!.startsWith('https://')) throw new Error(`${name} must be an https:// address in production`);
  }
  if (!process.env.PAGE_URL_TEMPLATE!.includes('{slug}')) throw new Error('PAGE_URL_TEMPLATE must contain {slug}');
}

export function loadConfig() {
  checkProduction();
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
    billing: billingConfig(),
  };
}

/**
 * BILLING_PROVIDER picks who takes Pro payments. Until a payment provider is approved
 * and plugged in, production runs with "none" (Pro shows as opening soon) and
 * development uses "test": a fake checkout where no money moves and no domain is
 * really registered. "test" is refused in production.
 */
function billingConfig() {
  const production = process.env.NODE_ENV === 'production';
  const provider = process.env.BILLING_PROVIDER || (production ? 'none' : 'test');
  if (provider !== 'none' && provider !== 'test') throw new Error(`Unknown BILLING_PROVIDER ${provider}`);
  if (provider === 'test' && production) throw new Error('BILLING_PROVIDER=test is for development only');
  return { provider: provider as 'none' | 'test' };
}

export type Config = ReturnType<typeof loadConfig>;
export const CONFIG = Symbol('CONFIG');
