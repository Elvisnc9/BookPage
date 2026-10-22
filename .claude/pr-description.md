## BookPage MVP: steps 1–8

Everything built so far for the Sunday 18 October launch: the monorepo, database, Google sign-in, onboarding, booking pages and engine, emails and reminders, the owner dashboard and the marketing site. Step 9 (SEO, privacy and terms) comes next.

### What's in it

| Area | Where | Notes |
| --- | --- | --- |
| Monorepo | root, `packages/shared` | pnpm workspaces, strict TypeScript, shared zod schemas and helpers |
| Database | `apps/api/prisma` | 12 tables on Neon; **double bookings are refused by a Postgres exclusion constraint** |
| Sign-in | `apps/api/src/auth`, `apps/web/src/middleware.ts` | Google only, httpOnly session cookie on the app host, CSRF origin check |
| Onboarding | `apps/web/src/components/onboarding` | 5 steps with autosave; publish picks the page address |
| Availability | `apps/api/src/availability` | Pure engine, unit-tested first (time zones and the DST day included) |
| Booking pages | `apps/web/src/pages/site/[slug]` | Server-rendered, **no JavaScript**; book, cancel, add to calendar, quote requests |
| Emails | `apps/api/src/email`, `apps/api/src/reminders` | Resend; confirmation, owner alerts, approve/decline/cancel, day-before reminder job |
| Dashboard | `apps/web/src/pages/app` | Today, Bookings (approve/decline/cancel/done/no-show), My page editing |
| Marketing | `apps/web/src/pages/index.astro`, `pricing.astro` | Ported from Landing.dc.html with GSAP + Lenis; Pro waitlist |
| Rate limits | `apps/api/src/public/public-throttler.guard.ts` | Per visitor IP and business on public endpoints |

### Hosts

- `bookpage.app` / `www.`: marketing
- `app.bookpage.app`: owner app (`/api/*` is proxied to the NestJS API)
- `{slug}.bookpage.app`: booking pages

In dev: `localhost:4321` (owner app), `www.localhost:4321` (marketing), `glowstudio.localhost:4321` (demo booking page).

### Tests

- 39 API unit tests: availability engine, auth routes, email templates, rate limits
- 53 database tests (`pnpm --filter @bookpage/api test:db`): booking races, the overlap guard, onboarding autosave, dashboard actions, emails, reminders, waitlist
- 8 web and 12 shared unit tests
- Every flow was also tried by hand in the browser at phone and desktop sizes

### Decisions worth a look

- **Market is Europe and the US.** Each business has its own time zone and currency; prices are stored in cents.
- **Session cookie lives on the app host** (not `api.`), with the API behind an `/api` proxy, so server-rendered pages see the session and booking subdomains never get the cookie.
- **Booking pages and the dashboard use plain forms**, so they are fast on cheap phones. Only onboarding and My page are Preact islands.
- **Manage links** ("change or cancel") are an HMAC of the booking ID, so reminders can include them.
- **Marketing copy only claims what ships.** The design's invented testimonials and business names were removed; AI, Calendar sync and Pro are marked as coming.

### Before launch (not in this PR)

- Google OAuth client, Resend domain and API keys, `MANAGE_TOKEN_SECRET`, `PROXY_SECRET`
- Hosting: web on Cloudflare Workers, API on Render, Railway or Fly (US East), wildcard DNS
- Seed the Glow Studio demo in production (the marketing "See an example" link points at it)
- Step 9: SEO, share images, privacy and terms pages
