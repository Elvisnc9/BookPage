import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC (not esbuild) so Nest's decorator metadata is emitted in tests.
// `*.db.spec.ts` hit the real database and only run with `pnpm test:db`.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: process.env.TEST_DB ? ['src/**/*.db.spec.ts'] : ['src/**/*.spec.ts'],
    exclude: process.env.TEST_DB ? [] : ['src/**/*.db.spec.ts'],
    setupFiles: process.env.TEST_DB ? ['dotenv/config'] : [],
    // DB specs share one database (counts such as the marketing stats see every
    // file's businesses), so run them one file at a time.
    fileParallelism: !process.env.TEST_DB,
    // Unit tests never talk to Clerk; these only satisfy loadConfig() (the auth spec sets its own key).
    env: {
      CLERK_SECRET_KEY: 'sk_test_unit',
      CLERK_JWT_KEY: 'set-per-test',
      APP_ORIGIN: 'http://localhost:4321',
      PROXY_SECRET: 'test-proxy-secret',
    },
    testTimeout: process.env.TEST_DB ? 30_000 : 5_000,
    hookTimeout: 60_000, // Nest + Prisma boot is slow on cold machines
  },
});
