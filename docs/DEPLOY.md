# Going live — runbook

Everything in the code is ready to deploy. What's left is accounts, DNS and secrets, which only you can set up. Do the steps in order; each ends with a check. Roughly **2–3 hours** the first time.

> Names below assume the brand **BookPage** on **bookpage.app**. If you choose another name or domain, replace it everywhere it appears (this file, `render.yaml`, `apps/web/wrangler.jsonc`, `apps/api/.env.example`) before you start.

## 0. Before you start

- [ ] **You own the domain.** It must be in an account you control. (On 22 Oct, `bookpage.app` was registered since 2023 via Squarespace Domains but pointed nowhere; confirm it's yours. If not, buy one now.)
- [ ] **Fill in `apps/web/src/lib/legal.ts`**: your legal name or company, address, a real privacy contact email, and the country whose law applies. The privacy and terms pages show `[placeholders]` until you do.
- [ ] Accounts you'll need (all have free tiers except Render): Cloudflare, Neon, Render, Resend, Clerk, Google Cloud (for Clerk's Google sign-in).

Generate two secrets now and keep them in your password manager:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Run it twice: one value is `PROXY_SECRET`, the other is `MANAGE_TOKEN_SECRET`. **Never change `MANAGE_TOKEN_SECRET` after launch**: it signs every "change or cancel" link already in customers' inboxes.

## 1. Domain on Cloudflare

1. Cloudflare → **Add a site** → `bookpage.app` → Free plan. Change the nameservers at your registrar to the two Cloudflare gives you.
2. **DNS** → add these records, all **Proxied** (orange cloud):

   | Type | Name | Content |
   |---|---|---|
   | AAAA | `@` | `100::` |
   | AAAA | `www` | `100::` |
   | AAAA | `app` | `100::` |
   | AAAA | `*` | `100::` |

   (`100::` is a placeholder address; the Worker routes answer these hostnames.)
3. **SSL/TLS** → mode **Full (strict)**. Cloudflare's Universal SSL covers `bookpage.app` and `*.bookpage.app`.

✅ Check: `nslookup app.bookpage.app` returns Cloudflare addresses.

## 2. Production database (Neon)

Keep production separate from the database the tests use.

1. Neon → your project → **Branches** → create `production` (or a new project in **AWS us-east-2**, to sit next to the API).
2. Copy both connection strings: **pooled** (host contains `-pooler`) → `DATABASE_URL`, **direct** → `DIRECT_URL`. Both end with `?sslmode=verify-full`.
3. Turn on **point-in-time restore** (Neon keeps history; check the retention on your plan).

The API applies migrations on every start, so there's nothing to run by hand yet.

## 3. Email (Resend)

1. Resend → **Domains** → add `mail.bookpage.app` → add the DNS records it shows (in Cloudflare, these are **DNS only**, grey cloud) → **Verify**.
2. **API keys** → create one with "Sending access" → this is `RESEND_API_KEY`.

✅ Check: the domain shows **Verified**.

## 4. Owner sign-in (Clerk)

Clerk handles sign-in (Google and email), sessions and cookies. Development keys only work on localhost, so production needs Clerk's production instance.

1. Clerk dashboard → **Go to prod** (creates the production instance) → domain `bookpage.app`.
2. Add the DNS records Clerk lists (CNAMEs such as `clerk.`, `accounts.` and the email ones) in Cloudflare as **DNS only (grey cloud)**, then wait for Clerk to show them verified.
3. **Google**: production needs your own Google OAuth client. Google Cloud Console → OAuth consent screen (app BookPage, scopes `email`, `profile`, `openid`, **Publish app**) → Credentials → OAuth client ID (Web), with the redirect URI Clerk shows under **SSO connections → Google**. Paste the client ID and secret into Clerk.
4. Under **Configure → Paths / Domains**, the app lives at `https://app.bookpage.app` (sign-in at `/sign-in`).
5. Copy the production keys from **API keys**: publishable key (`pk_live_…`), secret key (`sk_live_…`) and the JWT public key (PEM). You'll paste them into Render (step 5) and Cloudflare (step 6).

## 5. API (Render)

1. Render → **New → Blueprint** → connect the GitHub repo → it reads `render.yaml` and creates **bookpage-api** (Docker, Ohio, Starter plan, about $7/month). It must be an always-on plan, because the reminder and deposit-hold jobs run inside the server.
2. Fill in the secret values it asks for: `DATABASE_URL`, `DIRECT_URL`, `CLERK_SECRET_KEY`, `CLERK_JWT_KEY` (the PEM on one line, `
` between lines), `RESEND_API_KEY`, `PROXY_SECRET`, `MANAGE_TOKEN_SECRET`.
3. Wait for the first deploy (it builds the image, runs migrations, starts).
4. **Custom domain**: Settings → Custom Domains → `api.bookpage.app`. In Cloudflare DNS add the CNAME Render shows, and set it to **DNS only (grey cloud)**. Otherwise the Worker's wildcard route would catch it.
5. Load the templates and the Glow Studio demo (the marketing page's "example" link points to it). From your machine, with the production URLs in your shell:

   ```bash
   cd apps/api
   NODE_ENV=production DATABASE_URL="<pooled url>" DIRECT_URL="<direct url>" corepack pnpm db:seed
   ```

   With `NODE_ENV=production` the seed adds no fake bookings or customers.

✅ Check: `https://api.bookpage.app/health` returns `{"ok":true}`, and `https://api.bookpage.app/public/glowstudio` returns JSON.

## 6. Web (Cloudflare Workers)

1. Log in once: `cd apps/web && corepack pnpm exec wrangler login`.
2. Deploy: `corepack pnpm --filter @bookpage/web run deploy`. This builds with the production settings in `wrangler.jsonc` (domain, app host, API URL) and attaches the routes `bookpage.app/*` and `*.bookpage.app/*`.
3. Add the secrets: Cloudflare → **Workers & Pages** → **bookpage-web** → **Settings → Variables and Secrets** → add **Secret** `PROXY_SECRET` (same value as on Render) and **Secret** `CLERK_SECRET_KEY`. The publishable key is read at build time: put `PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…` in `apps/web/.env.production` (or your shell) before step 2. Redeploy so it all takes effect.

✅ Check: `https://bookpage.app`, `https://bookpage.app/privacy` and `https://glowstudio.bookpage.app` load.

## 7. Smoke test on a phone (15 minutes)

- [ ] `https://app.bookpage.app` → **Continue with Google** (or email) → onboarding → publish a test page (e.g. `yourname-test`).
- [ ] Open `https://yourname-test.bookpage.app` on your phone → book a time → the confirmation email arrives (check spam).
- [ ] Open the email's **Change or cancel** link → **Change time** → pick another → the "moved" email arrives, for you and for the owner.
- [ ] On **My page → Booking rules**, paste a payment link (a Stripe Payment Link or PayPal.me) and set a deposit on one service. Book it → the email shows **Pay deposit** → in the dashboard, tap **Deposit received** → the customer gets "confirmed".
- [ ] Book another deposit service and don't confirm it → after the hold time (set it to 1 hour to test) it's released and both emails arrive.
- [ ] **Share** page → copy the link, download the QR, scan it with a phone camera.
- [ ] Book 11 times in a minute from one phone → the 11th says "Too many attempts". (This proves `PROXY_SECRET` is working: without it, the limit would apply to everyone at once.)
- [ ] Delete the test page's bookings, or keep the page for demos.

## 8. After launch (first weeks)

- **Error alerts**: add Sentry (free tier) to the API and web app, and a free uptime check on `/health`.
- **Backups**: confirm Neon point-in-time restore covers at least 7 days.
- **Images** are stored in the database for now. Move them to Cloudflare R2 before you have hundreds of businesses.
- **One API instance only**: rate-limit counters are in memory. Before adding a second instance, move them to Redis or a Durable Object.

## Monthly cost at launch

| Item | Cost |
|---|---|
| Cloudflare (DNS, Workers free tier: 100k requests/day) | $0 |
| Neon (free tier) | $0 |
| Resend (free tier: 3,000 emails/month, 100/day) | $0 |
| Render Starter (always-on API) | ~$7 |
| Domain | ~$15/year |

The first thing to outgrow is **Resend's 100 emails/day** on the free tier. Upgrade (about $20/month) once you have about 15 active businesses.
