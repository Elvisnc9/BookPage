# Free hosting for testers ($0)

Everything here is on free plans. No card should be needed, though Render may ask for one to verify your account; you are never charged on the free plan. It takes about **2 hours** the first time. Do the steps in order; each ends with a check.

| Piece | Where | Free limit |
|---|---|---|
| Domain | DigitalPlat FreeDomain (e.g. `bookpage.dpdns.org`) | Free; renew yearly in their dashboard |
| Website (marketing, owner app, booking pages) | Cloudflare Workers | 100,000 requests a day |
| API | Render (free web service) | Sleeps after 15 min idle; 750 hours a month |
| Keep-awake ping | cron-job.org | Free |
| Database | Neon | 0.5 GB |
| Email | Resend | 100 a day, 3,000 a month |
| Sign-in | Clerk (production instance) | 10,000 monthly users |

Below, **`YOURDOMAIN`** means the domain you get in step 1, for example `bookpage.dpdns.org`.

---

## 0. Before you start (10 min)

1. Push the code to GitHub so Render can build it. In the repo folder:
   ```bash
   git push -u origin chore/monorepo-scaffold
   ```
2. Generate two secrets and save them in a note only you can see (a password manager is best):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
   Run it twice. The first value is `PROXY_SECRET`, the second is `MANAGE_TOKEN_SECRET`. Never change `MANAGE_TOKEN_SECRET` later: it signs the "change or cancel" links in customers' emails.
3. Fill in `apps/web/src/lib/legal.ts` (your name, a city and country, a contact email you read). The privacy page shows `[placeholders]` until you do. Testers will see it.

## 1. A free domain (20 min, then up to a few hours of waiting)

1. Go to **https://dash.domain.digitalplat.org** → sign up (GitHub sign-in works).
2. Register a name. Pick an ending that says **Available**, such as `.dpdns.org`. Choose something short like `bookpage` or `getbookpage`.
3. Go to **https://dash.cloudflare.com** → sign up (free, no card) → **Add a domain** → type `YOURDOMAIN` → choose the **Free** plan.
4. Cloudflare shows **two nameservers** (like `ada.ns.cloudflare.com`). In the DigitalPlat dashboard, open your domain → **Nameservers** → paste both → save.
5. Wait until Cloudflare emails you that the domain is **Active** (usually under an hour, sometimes longer).

✅ Check: Cloudflare shows the domain as **Active**.

**Then send me `YOURDOMAIN`.** I'll put it into `apps/web/wrangler.jsonc` (5 places) and commit it.

## 2. DNS records in Cloudflare (5 min)

Cloudflare → your domain → **DNS → Records** → **Add record**, four times, all with the orange cloud **on (Proxied)**:

| Type | Name | IPv6 address |
|---|---|---|
| AAAA | `@` | `100::` |
| AAAA | `www` | `100::` |
| AAAA | `app` | `100::` |
| AAAA | `*` | `100::` |

(`100::` is a placeholder. The website answers these names itself.) Then **SSL/TLS → Overview → Full (strict)**.

## 3. Database for testers (5 min)

Keep testers' data apart from the one the tests use.

1. **https://console.neon.tech** → your project → **Branches** → **Create branch** → name `production`.
2. On that branch, **Connect** → copy the **pooled** connection string (host contains `-pooler`) → that's `DATABASE_URL`. Untick "pooled" and copy again → that's `DIRECT_URL`.

## 4. Email (Resend) (15 min)

1. **https://resend.com** → sign up → **Domains → Add domain** → `mail.YOURDOMAIN`.
2. It lists DNS records. Add each one in Cloudflare exactly as shown, with the cloud **off (DNS only, grey)**.
3. Back in Resend → **Verify**. Wait until it says **Verified**.
4. **API Keys → Create** → permission "Sending access" → copy it. That's `RESEND_API_KEY`.

✅ Check: the domain shows **Verified**.

## 5. Sign-in (Clerk production) (20 min)

This removes the "Development" label from sign-in emails and the 100-user cap.

1. **https://dashboard.clerk.com** → your BookPage app → top switch **Development → Production** → **Create production instance** → domain `YOURDOMAIN`.
2. Clerk lists DNS records (CNAMEs such as `clerk`, `accounts`, `clkmail`, `clk._domainkey`). Add each in Cloudflare with the cloud **off (DNS only, grey)**. Wait until Clerk shows them all verified.
3. **User & authentication → Email**: keep **Email verification code** on. To start simple, turn **Google off** in production. Google needs your own Google Cloud setup, which you can add later.
4. **Configure → Domains/Paths**: the app is at `https://app.YOURDOMAIN`, sign-in at `/sign-in`.
5. **API keys** (production): copy the **Publishable key** (`pk_live_…`), the **Secret key** (`sk_live_…`), and under **Show JWT public key** the **PEM** key.

## 6. The API on Render (20 min)

1. **https://dashboard.render.com** → sign up with GitHub → allow access to the `BookPage` repo.
2. **New → Blueprint** → pick the repo, branch `chore/monorepo-scaffold` → it reads `render.yaml` and creates **bookpage-api** on the **Free** plan.
3. Fill in the values it asks for:

   | Name | Value |
   |---|---|
   | `APP_ORIGIN` | `https://app.YOURDOMAIN` |
   | `PAGE_URL_TEMPLATE` | `https://{slug}.YOURDOMAIN` |
   | `EMAIL_FROM` | `bookings@mail.YOURDOMAIN` |
   | `DATABASE_URL`, `DIRECT_URL` | from step 3 |
   | `CLERK_SECRET_KEY` | `sk_live_…` from step 5 |
   | `CLERK_JWT_KEY` | the PEM from step 5, on one line, with `\n` where the line breaks were |
   | `RESEND_API_KEY` | from step 4 |
   | `PROXY_SECRET`, `MANAGE_TOKEN_SECRET` | from step 0 |

4. **Apply**. The first build takes 5–10 minutes. If a value is missing, the log says exactly which one (the API refuses to start half-configured). Add it under **Environment** and redeploy.
5. Note the service address at the top, e.g. `https://bookpage-api.onrender.com`. **If it's different, tell me**: it goes into `apps/web/wrangler.jsonc`.
6. Load the templates and the Glow Studio demo page into the testers' database. From the repo folder:
   ```bash
   cd apps/api
   NODE_ENV=production DATABASE_URL="<pooled url>" DIRECT_URL="<direct url>" corepack pnpm db:seed
   ```

✅ Check: `https://bookpage-api.onrender.com/health` shows `{"ok":true}`.

## 7. Keep the API awake (5 min)

A free Render service falls asleep after 15 minutes, which would also pause booking reminders.

1. **https://cron-job.org** → sign up (free) → **Create cronjob**.
2. URL `https://bookpage-api.onrender.com/health`, schedule **every 10 minutes** → save.

✅ Check: after an hour, its history shows green ticks.

## 8. The website on Cloudflare (15 min)

1. In `apps/web`, create a file `.env.production` with one line (it's ignored by git):
   ```
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…
   ```
2. Log in to Cloudflare from your terminal (a browser window opens):
   ```bash
   cd apps/web
   corepack pnpm exec wrangler login
   ```
3. Deploy:
   ```bash
   corepack pnpm --filter @bookpage/web run deploy
   ```
4. Add the two secrets (it asks you to paste each value):
   ```bash
   corepack pnpm exec wrangler secret put PROXY_SECRET --env production
   ```
   ```bash
   corepack pnpm exec wrangler secret put CLERK_SECRET_KEY --env production
   ```

✅ Check: `https://YOURDOMAIN`, `https://app.YOURDOMAIN` and `https://glowstudio.YOURDOMAIN` all load.

## 9. Try it yourself before testers (15 min)

- [ ] On your phone: `https://app.YOURDOMAIN` → sign in with your email → onboarding → publish a test page. Watch the launch steps tick.
- [ ] Open your page → book a time → the confirmation email arrives (check spam the first time).
- [ ] Open the email's **Change or cancel** link → move the booking → the "moved" email arrives.
- [ ] **Plan** shows "Pro opens soon" (no payments on the live site, as intended).

Then send testers `https://YOURDOMAIN`.

## What to expect on free plans

- **First visit after a quiet spell** can take ~1 minute if the ping missed (Render waking up). The ping makes this rare.
- **Emails**: 100 a day across everyone. Enough for a handful of testers.
- **Website CPU limit**: Cloudflare's free plan allows 10 ms of compute per request. If testers see "Worker exceeded CPU" errors, tell me: I'll trim the heavy page or you move to the $5 plan later.
- When funding arrives: Render **Starter** (~$7/month, no sleeping) and your own domain. Nothing in the code changes.
