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
    // Unit tests never talk to Google; these only satisfy loadConfig().
    env: { GOOGLE_CLIENT_ID: 'test-client-id', GOOGLE_CLIENT_SECRET: 'test-secret', APP_ORIGIN: 'http://localhost:4321' },
    testTimeout: process.env.TEST_DB ? 30_000 : 5_000,
    hookTimeout: 60_000, // Nest + Prisma boot is slow on cold machines
  },
});
