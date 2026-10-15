# BookPage

A free booking page with an AI receptionist for every local business. "Never miss a booking."

## Layout

```
apps/web         Astro (server output, Cloudflare Workers). Marketing site, booking pages, owner app.
apps/api         NestJS. Auth, bookings, availability, emails, cron.
packages/shared  Enums, slug rules and other types both apps agree on.
design/          Design handoff (.dc.html). Reference only — rebuild, don't copy.
docs/            Product docs exported from Claude Docs.
```

## Hosts

| Host | Serves | Astro route |
| --- | --- | --- |
| `bookpage.app`, `www.` | Marketing | `src/pages/*` |
| `app.bookpage.app` | Owner app | `src/pages/app/*` |
| `{slug}.bookpage.app` | Booking page | `src/pages/site/[slug]/*` |
| `app.bookpage.app/api/*` | NestJS API, proxied by the web app | `src/pages/app/api/[...path].ts` |

`apps/web/src/middleware.ts` rewrites by host; `/app` and `/site` are never reachable directly.
The session cookie is host-only on `app.bookpage.app` (the API sits behind its `/api/*` proxy),
so booking subdomains never receive it and no CORS is needed.

## Develop

Requires Node 22.12+ and pnpm (via Corepack).

```bash
corepack enable
pnpm install
pnpm --filter @bookpage/shared build
pnpm dev
```

- Owner app: http://localhost:4321 (plain localhost because Google OAuth rejects `*.localhost`)
- Marketing: http://www.localhost:4321
- Booking page: http://glowstudio.localhost:4321
- API: http://localhost:3000/health (also http://localhost:4321/api/health)

Copy `apps/*/.env.example` to `.env` (web on Cloudflare reads `.dev.vars` too).

## Design tokens

`apps/web/src/styles/tokens.css` holds every colour, radius, shadow and easing as CSS variables.
`base.css` rebuilds the shared pieces from the handoff: `.box`, `.btn`, `.chip`, `.lab`, `.scan`, `.lift`.
Use tokens, never raw hex, in components.
