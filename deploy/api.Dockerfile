# The BookPage API (NestJS) as one container: builds the shared package and the
# API, applies pending database migrations on start, then serves on $PORT.
# Works on Render, Railway, Fly.io or any Docker host. Build from the repo root:
#   docker build -f deploy/api.Dockerfile -t bookpage-api .
FROM node:22-slim

ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable && apt-get update -y && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Dependencies first, so code changes don't reinstall them. The API's postinstall
# runs `prisma generate`, which needs the schema and config.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
# Every workspace manifest, so the frozen lockfile matches (only the API's tree is installed).
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
RUN pnpm install --frozen-lockfile --filter @bookpage/api... --prod=false

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @bookpage/shared build && pnpm --filter @bookpage/api build

WORKDIR /app/apps/api
EXPOSE 3000
# Migrations are idempotent; running them on start keeps schema and code in step.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
