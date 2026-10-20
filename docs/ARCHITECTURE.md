# BookPage — Architecture Overview

_Snapshot: 17 Oct 2026, the day before launch (Sun 18 Oct). Written from the code on `chore/monorepo-scaffold`._

---

## 1. What BookPage is

BookPage gives every local business (salons, barbers, spas, tutors, trainers, photographers, cleaners, and so on) a **free booking website** at `{their-name}.bookpage.app`.

- **The owner** signs in with Google, goes through a 5-step onboarding (pick a website template, about the business, services and prices, booking and hours, review and publish) and gets a live page.
- **Their customers** open the page, pick a service and time, type their name and email, and they're booked. Customers **never create an account**.
- Both sides get **emails**: the customer gets a confirmation, a reminder the day before and a cancel link. The owner gets an alert for every booking, cancellation and enquiry.
- The owner manages everything from a **dashboard** (Today, Bookings, My page).

**Market:** Europe and USA. Every business has its own time zone, currency (minor units, ISO 4217) and country (phone numbers stored as E.164). GDPR is designed in from the start: customers can be anonymised without breaking the owner's records.

**Tagline:** "Never miss a booking." An AI receptionist (answering customer questions from the business's approved FAQs) is planned, and the data model is ready for it, but it isn't built yet.

---

## 2. The big picture

```
                    Browser (owner / customer)
                              │
                              ▼
        ┌──────────────────────────────────────────────┐
        │  apps/web — Astro 7 on Cloudflare Workers    │
        │                                              │
        │  bookpage.app / www.     → marketing site    │
        │  app.bookpage.app        → owner app (Preact)│
        │  {slug}.bookpage.app     → booking pages     │
        │  app.bookpage.app/api/*  → proxy to the API  │
        └──────────────────────────────────────────────┘
                              │ server-side fetch
                              │ (+ visitor IP and PROXY_SECRET)
                              ▼
        ┌──────────────────────────────────────────────┐
        │  apps/api — NestJS 12                        │
        │  auth · business · public · site · email ·   │
        │  reminders (cron) · rate limiting            │
        └──────────────────────────────────────────────┘
                 │                          │
                 ▼                          ▼
     Neon Postgres (via Prisma 7)     Resend (email HTTP API)

        packages/shared — zod schemas, types, time zone/money/slug
        helpers, template contract. Imported by BOTH apps.
```

### Monorepo layout

| Path | What | Tech |
|---|---|---|
| `apps/web` | Every web page: marketing, owner app, booking pages, and the proxy to the API | Astro 7 (server output) on Cloudflare Workers, Preact islands, GSAP and Lenis on marketing only |
| `apps/api` | All business logic and data | NestJS 12, Prisma 7, Postgres (Neon), @nestjs/schedule, @nestjs/throttler |
| `packages/shared` | The contract both apps agree on | TypeScript and zod 4 |
| `design/` | Design handoff files (`*.dc.html`), for reference only | — |
| `design-refs/` | The screenshots you supplied as references | — |
| `docs/` | Product docs, including this file | — |

Tooling: pnpm 10 workspaces (`corepack pnpm`), TypeScript strict, Vitest everywhere, Node ≥ 22.12.

### Why it's shaped this way

- **One profile, one source of truth.** The booking page, the availability engine, the emails and (later) the AI all read the same `Business` record. Nothing is duplicated.
- **The browser never talks to the API directly.** The web app proxies `/api/*`, so the session cookie lives only on `app.bookpage.app`. Booking subdomains never see it, and no CORS setup is needed.
- **Booking pages need no JavaScript.** Plain HTML forms and links, server-rendered, so they're fast on any phone and work even if JS fails.
- **The database enforces the important rules itself.** Double bookings, price/type mismatches, bad hours and bad slugs are blocked by Postgres constraints, not just by app code.
- **Shared zod schemas.** The same validation runs in the browser (onboarding forms) and on the server (API), so error messages match.

---

## 3. Hosts and routing (apps/web)

`apps/web/src/middleware.ts` looks at the hostname and **rewrites** the request to an internal folder. `/app/*` and `/site/*` can't be reached directly.

| Host | Serves | Folder |
|---|---|---|
| `bookpage.app`, `www.bookpage.app` | Marketing: landing, pricing, waitlist, page-address checker | `src/pages/*.astro` |
| `app.bookpage.app` | Owner app: sign-in, onboarding, dashboard (Today, Bookings, My page) | `src/pages/app/*` |
| `{slug}.bookpage.app` | A business's booking page and booking flow | `src/pages/site/[slug]/*` |
| `app.bookpage.app/api/*` | Pass-through to NestJS | `src/pages/app/api/[...path].ts` |
| `*/media/{id}` | Uploaded images (proxied from the API) | `src/pages/media/[id].ts` |

Dev equivalents: `localhost:4321` (owner app), `www.localhost:4321` (marketing), `glowstudio.localhost:4321` (booking page), `localhost:3000` (API).

### The customer booking flow (no JS)

```
/                    business home page (template-rendered)
  └─ /book?service=…&staff=…&date=…    pick who and when (14 days of slots)
       └─ /details?service=…&start=…   your details form (POST)
            ├─ 409 slot taken → back to /book with "that time was just taken"
            ├─ 400 validation → field errors shown inline
            ├─ 429 rate limit → "Too many attempts, try again in a minute"
            └─ success → /booked/{id}?t={token}   confirmation + cancel button
                              └─ /booked/{id}/calendar.ics   add to calendar
/enquire?service=…   for quote-only services: send a request instead of booking
```

Bots: a hidden honeypot field (`company`) on the forms, plus API rate limits (section 7).

### The owner app

- **Sign in:** Google OAuth. In dev, `DEV_LOGIN=true` also lets you sign in as the Glow Studio demo owner or as a new owner by email; this is refused in production.
- **Onboarding:** a Preact island (`src/components/onboarding/*`): Template → About → Services → Booking → Review & publish, with colours, fonts and images edited alongside. It uses **autosave**. Each section saves itself about 700 ms after you stop typing, one request at a time, and retries with backoff on network errors. A live preview beside the form (a "Preview website" button on mobile) renders the **real chosen template** with the current draft.
- **Dashboard:** Today (numbers for today in the business's time zone), Bookings (list, approve, decline, cancel, complete, no-show), My page.

---

## 4. The API (apps/api)

### Modules

| Module | Responsibility | Routes |
|---|---|---|
| `auth` | Google OAuth, cookie sessions, dev login, CSRF origin check | `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/me`, `POST /auth/dev-login`, `POST /auth/logout` |
| `business` | The owner's own business: onboarding autosave, publish, uploads, bookings dashboard | `GET/PATCH /business`, `PUT /business/hours`, `PUT /business/services`, `PUT /business/staff`, `PATCH /business/rules`, `POST /business/media`, `DELETE /business/media/:id`, `GET /business/slug-available`, `POST /business/publish`, `GET /business/summary`, `GET /business/bookings`, `POST /business/bookings/:id/status` |
| `public` | Everything a customer can do on a booking page (no login) | `GET /public/:slug`, `GET /public/:slug/availability`, `POST /public/:slug/bookings`, `GET /public/:slug/bookings/:id`, `POST /public/:slug/bookings/:id/cancel`, `POST /public/:slug/enquiries` |
| `public` (marketing) | Marketing-site helpers | `GET /marketing/slug-available`, `POST /marketing/waitlist` |
| `site` | Website template catalogue and image serving | `GET /templates`, `GET /media/:id` |
| `email` | Builds and sends transactional email through Resend (logs them instead when no key is set) | — |
| `reminders` | Cron job every 15 minutes: day-before reminders | — |
| `availability` | The pure slot-finding engine (no database access) | — |
| `health` | Liveness | `GET /health` |

### Security layers

| Concern | How |
|---|---|
| Owner login | Google OAuth. The cookie holds a random token; the DB stores only its **SHA-256 hash**. 30-day sliding expiry, written back at most once a day. Cookie name `__Host-bp_session` in production (Secure, host-only). |
| CSRF | `OriginGuard`: any non-GET owner request must come from the app's own origin. Booking-page endpoints are exempt because they carry no cookie. |
| Tenant isolation | Every owner query is scoped by `ownerId`, so an owner can never read or write another business. |
| Customer booking access | No login. Each booking has a **manage token** = HMAC-SHA256(`MANAGE_TOKEN_SECRET`, booking id), sent in the email link. The DB stores only its hash, compared in constant time. |
| Abuse / spam | `@nestjs/throttler` on `/public/:slug`: 10 writes per minute and 60 per day **per visitor IP per business**; reads 120 per minute. The Worker forwards the visitor's IP in `x-bookpage-client-ip`, trusted **only** when `x-bookpage-proxy-secret` matches `PROXY_SECRET`. Plus the honeypot field. |
| Uploads | The real file type is detected from the first bytes (the Content-Type header is never trusted), with a size cap. Images are resized in the browser before upload. |
| Templates | Template rows are **data only**, validated with zod before use. Nothing from the database is ever executed (section 6). |

---

## 5. Database

Postgres on **Neon**, accessed through **Prisma 7** (`apps/api/prisma/schema.prisma`).

Conventions:
- **IDs** are UUID v7 (time-ordered).
- **Table and column names** are `snake_case`.
- **Money** is stored as integer **minor units** (cents) plus an ISO currency code.
- **Times of day** (opening hours) are **minutes from midnight in the business's own time zone**.
- **Moments** (bookings) are `timestamptz`.
- Every field is tagged in the schema as **[public]** (may appear on the booking page), **[private]** (used by booking logic, never shown) or **[owner]** (dashboard only).

Migrations:
1. `20261015042517_init`: core tables and the hand-written constraints.
2. `20261015075510_waitlist`: the Pro waitlist.
3. `20261016230000_site_templates_and_media`: website templates and uploaded images.

### Entity relationships

```
User 1─* Session
User 1─* Business ─── (MVP: one business per owner)
                 │
Business ─* OpeningHours        (kind: opening | booking)
Business ─1 BookingRules
Business ─* Service ─*─* Staff  (through StaffService)
Business ─* Customer
Business ─* Booking  ─→ Service, Staff, Customer
Business ─* Enquiry  ─→ Service?, Customer
Business ─* Faq
Business ─* MediaAsset ─→ Service?, Staff?
Business ─→ SiteTemplate?       (the chosen website template)
WaitlistEntry                   (standalone)
```

### Tables

#### Owners and auth

**`users`**: the business owner.
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| google_id | text | unique |
| email | text | unique |
| name, avatar_url | text? | from Google |
| created_at, updated_at | timestamptz | |

**`sessions`**: login sessions.
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| token_hash | text | unique. SHA-256 of the cookie token. The raw token is never stored. |
| user_id | uuid | → users, cascade delete |
| expires_at | timestamptz | 30-day sliding window |
| last_seen_at, created_at | timestamptz | |
| user_agent | text? | |

#### The business profile (the single source of truth)

**`businesses`**
| Column | Type | Visibility | Notes |
|---|---|---|---|
| id | uuid | | PK |
| owner_id | uuid | owner | → users |
| slug | text | public | unique; the subdomain. A DB check enforces the format: 3–40 chars, a–z, 0–9 and single hyphens. Reserved words are checked in the app. |
| name, description | text | public | |
| category | text? | public | `hair_salon`, `barber`, `spa`, `nails_lashes`, `clinic`, `tutor`, `fitness`, `photography`, `mechanic`, `cleaning`, `venue`, `other` |
| location_type | enum | public | `premises`, `mobile`, `both`, `online` |
| address_line1/2, city, region, postal_code | text? | public | |
| country | char(2) | public | ISO 3166, default `US` |
| service_areas | text[] | public | for mobile businesses |
| phone, whatsapp | text? | public | E.164 |
| email | text? | public | contact email shown on the page, not the login email |
| template_id | uuid? | public | → site_templates (Restrict). Null renders Classic. |
| theme | jsonb | public | owner's `{ accent?, font? }` on top of the template's defaults |
| timezone | text | private | IANA zone, default `America/New_York` |
| currency | char(3) | public | ISO 4217, default `USD` |
| locale | text | private | default `en` |
| onboarding_step | int | owner | 0–5 |
| published_at | timestamptz? | owner | **the page is live when this is set** |

**`opening_hours`**: a day can have several ranges (e.g. 9–13 and 14–18). A day with no rows is closed.
| Column | Type | Notes |
|---|---|---|
| business_id | uuid | → businesses |
| kind | enum | `opening` (shown on the page) or `booking` (separate booking hours, used only when `booking_rules.use_opening_hours = false`) |
| weekday | int | 1 = Monday … 7 = Sunday |
| opens_at, closes_at | int | minutes from midnight. DB check: 0 ≤ opens < closes ≤ 1440 |

**`booking_rules`**: one row per business. All private: they shape availability.
| Column | Default | Meaning |
|---|---|---|
| use_opening_hours | true | false = use the `booking`-kind hours instead |
| min_notice_min | 120 | earliest bookable start = now + this |
| window_days | 60 | how far ahead customers can book (1–365) |
| slot_step_min | 15 | start times offered every N minutes (5–240) |
| auto_confirm | true | false = new bookings start as `pending` until the owner approves |
| customer_fields | jsonb | `{phone, email, note}`, each `required`, `optional` or `off` |
| alert_channels | `["email"]` | how the owner is alerted |

#### Services and staff

**`services`**
| Column | Type | Notes |
|---|---|---|
| name, description | text | public |
| price_type | enum | `fixed`, `from`, `quote` (enquiry only, never booked) or `free` |
| price_minor | int? | DB check: required for fixed/from, null for quote/free |
| duration_min | int | > 0 |
| buffer_min | int | private. Gap kept free after each booking (cleanup, travel). |
| bookable | bool | false = shown on the page, but enquiry only |
| position | int | display order |
| archived_at | timestamptz? | soft delete, so past bookings keep their service |

**`staff`**: every business has at least one member (the owner, created at onboarding), so every booking sits on someone's calendar.
| Column | Notes |
|---|---|
| name, position | public |
| archived_at | soft delete |

**`staff_services`**: who can do which service (composite PK). In the MVP everyone does every bookable service.

#### Customers, bookings, enquiries

**`customers`**: created per business the first time someone books. **No accounts.**
| Column | Notes |
|---|---|
| name, email (lower-cased, DB-checked), phone (E.164) | unique on (business_id, email) |
| reminders_consent_at | when they agreed to reminder emails (GDPR) |
| anonymized_at | GDPR erasure: personal fields are blanked, bookings are kept for the owner's records |

**`bookings`**: the heart of the system.
| Column | Notes |
|---|---|
| business_id, service_id, staff_id, customer_id | relations (Restrict on service, staff and customer, so history can't be orphaned) |
| status | `pending`, `confirmed`, `cancelled`, `completed`, `no_show` |
| source | `page` (customer) or `owner` (added from the dashboard) |
| starts_at | timestamptz |
| ends_at | starts_at + duration: what the customer sees |
| blocked_until | ends_at + buffer: what the overlap guard uses |
| service_name, duration_min, price_type, price_minor, currency | **snapshot** of the service at booking time, so later price edits don't rewrite history |
| customer_note | |
| manage_token_hash | unique; hash of the customer's cancel-link token |
| reminder_sent_at, confirmed_at, cancelled_at, cancel_reason | lifecycle stamps |

**The double-booking guard** (hand-written SQL, Prisma can't express it):
```sql
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(starts_at, blocked_until, '[)') WITH &&
) WHERE (status IN ('pending', 'confirmed'))
```
Two live bookings for the same person can **never** overlap, even if two customers click "Book" in the same millisecond. Postgres rejects the second one (SQLSTATE 23P01), and the API turns that into "that time was just taken". There's also a check that `starts_at < ends_at ≤ blocked_until`.

**`enquiries`**: for quote-only or unbookable services.
| Column | Notes |
|---|---|
| service_id? | set null if the service is deleted |
| message, preferred_date | |
| status | `new`, `replied`, `closed` |

#### Content, templates and media

**`faqs`**: question and answer, `approved` flag, position. Only approved FAQs appear publicly, and they're what the future AI receptionist will read.

**`site_templates`**: the website-template catalogue (added 16 Oct).
| Column | Notes |
|---|---|
| slug | unique; key into the web app's code registry |
| name, description, category | category groups: beauty, food, fitness, creative, professional, retail, home |
| thumbnail_url, preview_image_url | optional card images |
| version | bumped when the look changes |
| is_active | false = retired. Not offered, and pages fall back to Classic with a notice to the owner. Templates are never deleted. |
| is_premium | |
| supported_sections | text[] |
| default_theme | jsonb `{accent, font}` |
| layout_configuration | jsonb, validated against `schema_version` |
| schema_version, position | |

Seeded templates (11): **classic, billboard, quiet, journal, carte, shelf, neighbour, noir, pulse, folio, practice**.

**`media_assets`**: uploaded images.
| Column | Notes |
|---|---|
| kind | `logo`, `hero`, `gallery`, `service` (one per service), `staff` (one per person) |
| service_id?, staff_id? | |
| content_type, width, height, byte_size | |
| data | **bytea: the image bytes are stored in Postgres** for now (no object storage yet). Served at `/media/{id}` with immutable caching. |
| position | gallery order |

**`waitlist`**: `(email, kind)` unique. People who asked to hear when Pro launches.

---

## 6. Business logic: how things actually work

### 6.1 Availability (`apps/api/src/availability/engine.ts`)
A **pure function** with no database access, so it's fully unit-tested:

> free slots = booking hours − existing bookings (incl. buffers) − minimum notice, within the booking window, sized by service duration.

- It walks each day in the business's **own time zone** (DST-safe via `zonedToUtc`).
- It offers a start every `slot_step_min` from opening time. The service must **finish** before closing, but the buffer may run past closing.
- For each slot it returns **which staff members are free**, in team order. The customer can pick a person or take "anyone".

### 6.2 Making a booking (`PublicService.book`)
1. Load the **published** business. Unpublished pages return 404.
2. The service must be bookable and not quote-only.
3. Re-run the engine for that day and confirm the requested start is still offered. If not, return **409 Slot taken**.
4. Validate the customer fields against the business's `customer_fields` rules. Phones become E.164 using the business's country.
5. **Upsert the customer** by (business, email) and record reminder consent.
6. Generate the booking id and the HMAC manage token.
7. Try to insert the booking for each free staff member in turn. **The exclusion constraint has the final say:** if a race took that person, try the next one; if all are taken, return 409.
8. Status is `confirmed` if `auto_confirm`, otherwise `pending` (a pending booking still **holds** the slot).
9. Fire emails **after** the commit, as fire-and-forget. A failed email never fails a booking.

### 6.3 Cancelling
- **Customer:** via the token link, only while `pending` or `confirmed` **and** before the start time. The owner gets an email.
- **Owner** (dashboard), with allowed transitions:
  - `pending` → `confirmed` (approve) or `cancelled` (decline)
  - `confirmed` (future) → `cancelled`
  - `confirmed` (started or past) → `completed`, `no_show` or `cancelled`
  - anything else → no changes
- The update is conditional on the status it checked, so two clicks or two tabs can't both apply. The customer is emailed on approve, decline and cancel.

### 6.4 Enquiries
Quote-only services, or a general "ask a question", create an `Enquiry`. The owner is emailed with **reply-to set to the customer**, so they can answer straight from their inbox.

### 6.5 Emails (`email/`)
| When | Who gets it |
|---|---|
| Booking created | Customer: confirmation (or "request sent" when pending), with manage and cancel links and a calendar file. Owner: new-booking alert. |
| Owner approves | Customer |
| Owner declines or cancels | Customer |
| Customer cancels | Owner |
| Enquiry | Owner (reply-to the customer) |
| Day before | Customer reminder |

Sent through **Resend** (`RESEND_API_KEY`). Without a key, emails are logged instead of sent.

### 6.6 Reminders (`reminders/`)
- A **cron job every 15 minutes** finds confirmed bookings starting within the next 24 hours.
- It skips them if the customer didn't consent, or if they booked less than a day ahead (their confirmation is recent enough).
- Each booking is **claimed with a conditional update** before sending, so two API instances or overlapping runs can never send the same reminder twice.
- It can be turned off with `REMINDERS_ENABLED=false`.

### 6.7 Onboarding and publishing (`BusinessService`)
- The first autosave creates a **draft business** with defaults: Mon–Sat 9:00–18:00, the owner as the first staff member, and default booking rules.
- Each section saves separately: profile (PATCH), hours (PUT), services (PUT, inside a transaction, re-linking staff), staff (PUT), rules (PATCH), media (POST and DELETE).
- **Publish** checks: every step complete, a valid and available template, and a free slug (the DB unique constraint catches races and returns 409). Then it sets `slug`, `template_id` and `published_at`. **Publishing pins the template the preview showed**, so the live site equals the preview.

### 6.8 Website templates: "the database decides, the code draws"
- `site_templates` rows say **which templates exist, their order, defaults and status**.
- `apps/web/src/site/registry.ts` is a **trusted code registry** that maps each slug to a Preact component (`Classic`, `Billboard`, `Quiet`, `Journal`, `Carte`, `Shelf`, `Neighbour`, `Noir`, `Pulse`, `Folio`, `Practice`) and lists the layout schema versions it understands.
- **Nothing from the DB is executed.** Rows are validated with zod (`parseTemplate` in `@bookpage/shared`). An invalid row is logged and skipped.
- An unknown slug, retired template or unsupported schema version **falls back to Classic** and shows the owner a notice. It never switches silently.
- The **same components** render the onboarding live preview and the published booking page, so preview equals live site.

---

## 7. Configuration (environment variables)

**API** (`apps/api/.env`, see `.env.example`)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection (runtime) |
| `DIRECT_URL` | Neon **direct** connection (migrations) |
| `APP_ORIGIN` | Owner app origin (cookie and CSRF), e.g. `https://app.bookpage.app` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth |
| `PROXY_SECRET` | Shared with the web app; lets the API trust the forwarded visitor IP |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email |
| `PAGE_URL_TEMPLATE` | e.g. `https://{slug}.bookpage.app`, used for links in emails |
| `MANAGE_TOKEN_SECRET` | HMAC key for customer cancel links (**required in production**) |
| `REMINDERS_ENABLED` | `false` disables the cron |
| `DEV_LOGIN` | dev-only sign-in shortcut, refused in production |
| `PORT` | default 3000 |

**Web** (`apps/web/.env` or `wrangler.jsonc` vars and secrets)
| Variable | Purpose |
|---|---|
| `ROOT_DOMAIN` | `bookpage.app` (prod) or `localhost` |
| `APP_HOST` | `app.bookpage.app` or `localhost` |
| `API_URL` | where the API lives, e.g. `https://api.bookpage.app` |
| `PROXY_SECRET` | secret: `wrangler secret put PROXY_SECRET --env production` |

---

## 8. Testing

| Suite | Command | What |
|---|---|---|
| API unit | `corepack pnpm --filter @bookpage/api test` | availability engine, auth routes, rate limits, email templates, health |
| API database | `corepack pnpm --filter @bookpage/api test:db` | runs against **real Neon**: double-booking race, sessions, onboarding and publish, the public booking flow, owner bookings, notifications, marketing, templates and media |
| Shared | `corepack pnpm --filter @bookpage/shared test` | schemas, time zone and money helpers, template contract |
| Web | `corepack pnpm --filter @bookpage/web test` / `typecheck` | host routing; `astro check` |

---

## 9. Where things stand (17 Oct 2026)

Everything below is merged to `main` and pushed. That push, on 20 Oct, also included later design refinements to the marketing page, the dashboard and onboarding, which this snapshot doesn't describe.

**Done**
- Monorepo, Astro on Cloudflare, NestJS, Prisma, Neon, with migrations and seed (Glow Studio demo, plus sample bookings outside production).
- Google sign-in, cookie sessions, CSRF guard, dev login.
- 5-step onboarding with autosave, live preview and publishing to `{slug}.bookpage.app`.
- Availability engine, the no-JS booking flow, enquiries, customer cancel links, `.ics` calendar files.
- The double-booking guard in Postgres.
- Transactional emails (Resend) and day-before reminders (cron).
- Owner dashboard: Today, Bookings (approve, decline, cancel, complete, no-show), My page.
- Rate limiting and visitor-IP forwarding on the public endpoints.
- Marketing site (landing with GSAP and Lenis motion, pricing, Pro waitlist, page-address checker).
- Booking page redesign (Glow Studio references); approved FAQs on the public profile.
- **Database-driven website templates:**
  - `site_templates` and `media_assets` tables, with a shared, versioned template contract
  - 11 distinct templates registered in `apps/web/src/site/registry.ts`
  - booking pages render through that registry
  - onboarding rebuilt around a Template step, a live preview of the real template, image uploads (logo, hero, gallery, service and staff photos), and theme overrides
  - test totals: 24 shared, 39 API unit, 63 API database, 72 web, all passing

**Known gaps and launch checklist**
- **Set `PROXY_SECRET`** on the API host and as a Worker secret. Without it, every visitor shares the Worker's rate-limit bucket (about 10 bookings a minute per business, site-wide).
- **Set `MANAGE_TOKEN_SECRET`, `RESEND_API_KEY` and `EMAIL_FROM`** in production, and verify the sending domain in Resend.
- **Rate-limit counters are held in memory:** correct for one API instance only. Running more than one needs Redis.
- **Images are stored in Postgres:** fine to start with; move them to object storage (e.g. Cloudflare R2) as uploads grow.
- **One business per owner** (MVP).
- **Not built yet:** the AI receptionist, Google Calendar sync, reviews and ratings, social links, Pro (waitlist only), payments and deposits, SMS or WhatsApp alerts (only email exists today).
- **Staff:** in the MVP, every staff member does every bookable service; per-person schedules and service assignment are a future step.
