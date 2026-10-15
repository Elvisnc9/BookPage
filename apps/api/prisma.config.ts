import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// The CLI (migrate, studio) uses the direct connection; the app connects
// through the pooled DATABASE_URL via the pg driver adapter (src/prisma).
// Read without env() so `prisma generate` (postinstall) works before .env exists.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
