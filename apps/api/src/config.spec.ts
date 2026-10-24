import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config';

const PROD = {
  NODE_ENV: 'production',
  APP_ORIGIN: 'https://app.example.org',
  PAGE_URL_TEMPLATE: 'https://{slug}.example.org',
  EMAIL_FROM: 'bookings@mail.example.org',
  RESEND_API_KEY: 're_test',
  MANAGE_TOKEN_SECRET: 'x'.repeat(43),
  PROXY_SECRET: 'y'.repeat(43),
  DATABASE_URL: 'postgresql://u:p@db.example.org/app',
  CLERK_SECRET_KEY: 'sk_test',
  CLERK_JWT_KEY: 'pem',
  BILLING_PROVIDER: '',
};

afterEach(() => vi.unstubAllEnvs());
const stub = (env: Record<string, string>) => { for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v); };

describe('production configuration', () => {
  it('starts when everything is set', () => {
    stub(PROD);
    expect(loadConfig()).toMatchObject({ appOrigin: 'https://app.example.org', billing: { provider: 'none' } });
  });

  it('refuses to start with a missing value, naming it', () => {
    stub({ ...PROD, EMAIL_FROM: '', PAGE_URL_TEMPLATE: '' });
    expect(() => loadConfig()).toThrow('Missing environment variables for production: PAGE_URL_TEMPLATE, EMAIL_FROM');
  });

  it('refuses plain http addresses and a page template without {slug}', () => {
    stub({ ...PROD, APP_ORIGIN: 'http://app.example.org' });
    expect(() => loadConfig()).toThrow('APP_ORIGIN must be an https:// address');
    stub({ ...PROD, PAGE_URL_TEMPLATE: 'https://pages.example.org' });
    expect(() => loadConfig()).toThrow('{slug}');
  });

  it('refuses the test payment provider', () => {
    stub({ ...PROD, BILLING_PROVIDER: 'test' });
    expect(() => loadConfig()).toThrow('development only');
  });
});
