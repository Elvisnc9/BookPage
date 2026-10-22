# The smallest MVP that matters — ready by Saturday 24 Oct

_Written Thu 22 Oct 2026. Builds on [the Wix research](wix-competitive-analysis.md) and [the architecture overview](../ARCHITECTURE.md). Analysis only: nothing here has been built yet._

---

## 1. The real-world picture first

**Who we're for.** A one-person (or small-team) appointment business: a lash tech, nail tech, braider, barber or home-studio hairdresser. Their clients find them on Instagram, WhatsApp and Google, then **DM to book**. Today the owner answers every DM by hand ("how much?", "are you free Saturday?"), writes appointments in a notebook or their phone, and loses money when people don't show up.

**What they actually want** is not a website. It's:
1. **Stop answering the same DMs.** One link that shows prices and free times.
2. **Stop losing money to no-shows.** Some commitment from the client before the slot is held.
3. **Get the client back.** Remind them when it's time for their next visit.

**Why Wix doesn't win this person** (all sourced in the research report):
- A free Wix site can't take bookings; the cheapest plan that can is about $29/month.
- Setup is a project: build a site, then configure Bookings, payments, policies and automations.
- Wix's deposits aren't available to every user and can't be combined with manual approval, and its customer-facing AI is being retired or is US-only.
- The specialists (Fresha, Booksy) charge 20–30% commission on "new" clients, which owners resent.

**So our pitch for outreach is one sentence:**
> "Your own booking link in 10 minutes. Clients see your prices and free times and book themselves. Free, no commission, and your clients stay yours."

---

## 2. What we have, what we don't need, what's missing

### Already built (and it's more than enough for an MVP)
- A free hosted booking page per business (`{name}.bookpage.app`), with 11 templates
- Google sign-in and a 5-step onboarding with a live preview, plus image uploads
- Real availability (hours, buffers, notice, booking window) and **no double bookings, guaranteed by the database**
- Booking without an account, a cancel link, add-to-calendar, and quote requests for "price on request" services
- Emails: confirmation, owner alert, approve/decline, day-before reminder
- An owner dashboard: Today, Bookings, approve/decline/cancel/no-show
- Rate limiting and spam protection on public forms
- A marketing site and a Pro waitlist

### Not needed this week (stop working on it)
- More templates or more marketing-page polish. 11 templates is already more than any small owner will compare.
- AI website generation, an AI receptionist, Google Calendar sync, custom domains, multiple businesses per owner, a marketplace, POS. All of these come later, or never.

### Missing, and it **blocks launch** (none of this is a feature, but without it nobody can use the product)
| # | Blocker | Why it matters |
|---|---|---|
| 1 | **Nothing is online.** `bookpage.app` and its subdomains don't respond, and the API has no host. | You can't send anyone a link. |
| 2 | **Domain ownership is unclear.** `bookpage.app` is registered (since 2023, via Squarespace Domains) but points nowhere. `bizconnect.app` is registered (July 2026, via Sav.com) and points to an unrelated server. | Is either one yours? If not, you need a domain you own before Saturday. Pick **one** brand name now. |
| 3 | **No privacy policy or terms.** | We store customers' names, emails and phones. In the EU/UK that needs a privacy notice (GDPR); owners will also ask. |
| 4 | **Production secrets and email.** `PROXY_SECRET`, `MANAGE_TOKEN_SECRET`, `RESEND_API_KEY`, and a verified sending domain in Resend. | Without them, emails don't send, or every visitor shares one rate limit. |
| 5 | **No way to reschedule.** The customer link only cancels. | A client who wants to move their slot has to cancel and rebook, or DM the owner again: exactly what we promised to stop. |

---

## 3. Three MVP options

Each one ships on top of what exists. They're ordered from smallest to biggest, and **they stack**: A is the floor, then B or C.

### MVP A — "The booking link, live" (the floor: must ship regardless)
**What:** put the current product online and make it easy to share.
- Deploy: web on Cloudflare Workers (already set up for it), API on a small Node host (e.g. Render, Railway or Fly, roughly $5–10/month), and Neon (free tier is fine to start).
- A domain you own, with DNS and wildcard subdomains.
- Privacy policy and terms pages.
- Resend sending domain verified and all production secrets set.
- **Share kit** on the "My page" screen: copy link, a QR code, and ready-to-paste text for the Instagram bio and a WhatsApp message ("Book with me here: …").
- **Reschedule link** in the confirmation email (it reuses the availability engine and cancel token we already have).

**Effort:** about 1.5 days. **Risk:** low; it's mostly setup.

**Revenue:** none directly; this is the acquisition wedge ("free forever"). Money comes from B or C, and from setup help (see §4).

### MVP B — "No-show protection, the simple way"
**What:** let the owner require a deposit **without us processing payments yet**.
- The owner adds **their own payment link** (Stripe Payment Link, PayPal.me, Revolut, Monzo or similar) and a deposit amount per service.
- When a client books, the booking is **held as pending** and the confirmation page and email say: "Pay your €10 deposit here to confirm. Your slot is held for 2 hours."
- The owner taps **"Deposit received"** in the dashboard (this reuses the existing approve flow) and the client gets a confirmation email.
- If nothing is received in time, the owner declines with one tap, or the slot frees automatically (a small cron job, extending the reminders job).
- A plain cancellation policy shown on the page: "Deposit refunded if you cancel 24h+ before."

**Why this version:** real deposits through Stripe Connect are the right long-term build, but payments, webhooks, refunds and identity checks in two days would be the buggy rush you said you don't want. This version gives owners the *behaviour* (clients commit before the slot is held) with no money touching our systems, no compliance burden, and it works in every country, including ones Stripe doesn't serve.

**Effort:** about 1 day on top of A. **Risk:** low. The trade-off is manual: the owner has to check their payment app.

**Revenue:** the clearest Pro feature, since it's tied to money the owner keeps. Later, upgrade it to built-in Stripe Connect deposits and take a small platform fee (the research suggests about 1.5% of deposits on Free, 0% on Pro).

### MVP C — "Bring them back" (rebooking loop)
**What:** each service gets a "come back after" interval (e.g. a cut every 6 weeks, lash fills every 3 weeks). After a visit is marked done, the client gets **one email** at the right time: "Time for your next fill? Book the same time with Ana" with a one-tap link pre-filled to the same service, person and time of day.
- Reuses the reminders cron and its no-double-send claim, the email templates, and the `/book` page.
- Needs a separate consent tick (in the EU this kind of email can count as marketing).

**Effort:** about 1 day on top of A. **Risk:** low-medium (consent wording).

**Revenue:** a strong Pro feature because the owner can *see* the bookings it brings back. It also matters more over months than in week one, since nobody has past visits yet.

### Comparison
| | A: Link live | B: Deposit hold | C: Rebook loop |
|---|---|---|---|
| Solves | "I answer DMs all day" | "People don't show up" | "Clients drift away" |
| Felt in week one? | Yes | Yes | No: needs past visits first |
| Build time | ~1.5 days | +1 day | +1 day |
| Risk | Low | Low | Low-medium |
| Pays | Indirectly (acquisition) | Yes (Pro, later fees) | Yes (Pro) |
| Beats Wix on | Free bookings, 10-minute setup | Deposit + approval together; works anywhere | Zero-setup rebooking |

### Recommendation for Saturday: **A + B**
- **A** is non-negotiable: without it, there's nothing to show anyone.
- **B** is the feature that makes an owner say "I need this" in the first conversation, and it's what the outreach pitch can lead with: *"free booking link, and clients pay a deposit before you hold the slot."*
- **C** is the first thing to build next week, once the first owners have completed visits.

If Saturday is too tight, ship **A alone** and use the outreach conversations to confirm that deposits really are the top ask before building B.

---

## 4. How this makes money (start small, stay honest)

| When | Revenue | How it works | Why |
|---|---|---|---|
| **From day one** | **Done-for-you setup**, e.g. €30–50 one-off (or free for the first 10 owners) | You set up their page with them on a call: services, prices, photos, link in bio. | Real money while the product is free, and the best possible user research. Owners in this segment often prefer "do it for me". |
| **From day one** | **Pro, ~€12 / $15 a month** | Take payment with a **Stripe Payment Link** or invoice. No billing system needed for the first customers; tag Pro businesses by hand in the database. | Matches the price already on the pricing page. Pro = deposit hold (B), no BookPage badge, and later rebooking nudges (C) and WhatsApp reminders. |
| **Later** (after Stripe Connect) | **Small fee on deposits taken through BookPage**, e.g. ~1.5% on Free, 0% on Pro | The fee is taken automatically on each deposit. | Earns money in proportion to the value delivered, and makes Pro an easy upgrade. |
| **Later** | Paid add-ons: WhatsApp/SMS messages, AI reply drafts | Metered usage. | These have real per-message costs, so charging for them is fair. |

**What not to do:** charge commission on clients (it's the #1 complaint about Fresha and Booksy), or lock basic booking behind a paywall (that's Wix's weakness and our wedge).

**One pricing-page fix:** today Pro is sold on "more looks and your own brand". The research suggests owners pay for **fewer no-shows and filled chairs**, not looks. Change the Pro pitch to lead with deposits.

---

## 5. What to add so it can scale (after Saturday, in order)

These are not features; they're what stops the product breaking when more businesses join.

1. **Error tracking and uptime alerts** (e.g. Sentry, plus a free uptime pinger), so you hear about bugs before owners do.
2. **Database backups:** confirm Neon point-in-time restore is on.
3. **Images off the database** to Cloudflare R2 (they're stored in Postgres today; fine for 10 businesses, not for 1,000).
4. **Shared rate-limit storage** (Redis or a Cloudflare Durable Object) before running more than one API instance.
5. **Real billing** (Stripe Billing) once more than about 10 owners pay, replacing the manual Payment Links.
6. **Stripe Connect deposits**, replacing B's manual hold once owners confirm they want it.

---

## 6. Plan to Saturday

| Day | Work | Done when |
|---|---|---|
| **Thu (today)** | Decide brand and domain; confirm you own it. Choose the API host. Write privacy and terms (a template adapted to BookPage is fine to start). | You have a domain you control and a host account. |
| **Fri** | Deploy web, API and database. DNS + wildcard subdomain. Resend domain. Production secrets. Share kit + reschedule link. Smoke-test a real booking end to end on a phone. | A stranger can open a real link and book. |
| **Sat** | MVP B (deposit hold), if Friday went smoothly. Set up the Glow Studio demo as a sales demo. Draft the outreach message. Start reaching out. | First 5 conversations booked. |

**Outreach (Saturday onward):** message 20–30 local beauty and grooming businesses whose Instagram bio says "DM to book". Offer to set up their page with them for free (the first 10), in exchange for feedback. Track for each: did they publish, did they share the link, did they get a booking in the first week, and would they pay for deposits.

---

## 7. Decisions only you can make

1. **Which market are you reaching out to on Saturday?** The product, pricing and research all target **Europe and the USA** (euros/dollars, GDPR, Stripe). If your "local customers" are where you are now, that changes things:
   - Stripe doesn't serve merchants in every country (for example, Nigerian businesses typically use Paystack or Flutterwave). MVP B's "paste your own payment link" approach works anywhere, which is another reason to build it that way first.
   - Currency, phone formats and reminder channels (WhatsApp matters even more) would need checking.
2. **Brand: BookPage or BizConnect?** And do you own the domain? Everything else (emails, links, the share kit) depends on it.
3. **A alone, or A + B by Saturday?** A + B if you want to lead outreach with no-shows; A alone if you'd rather ship the safest version and let the first conversations decide.

---

## Sources (checked 22 Oct 2026)
- Domain registrations: RDAP lookups for [bookpage.app](https://pubapi.registry.google/rdap/domain/bookpage.app) and [bizconnect.app](https://pubapi.registry.google/rdap/domain/bizconnect.app).
- Deposits and no-shows: vendor sources only. They claim a 40–55% reduction, but none shows its data, so treat this as directional: [Timely](https://nextjs.gettimely.com/blog/proven-strategy-to-reduce-no-shows), [SchedulingKit statistics](https://schedulingkit.com/statistics/appointment-deposit-statistics), [SchedulingKit deposit guide](https://schedulingkit.com/guides/appointment-deposit-guide).
- Stripe Connect onboarding (for the later built-in deposits): [hosted onboarding](https://docs.stripe.com/connect/hosted-onboarding), [SaaS onboarding](https://docs.stripe.com/connect/saas/tasks/onboard), [upcoming EU requirement changes](https://docs.stripe.com/connect/upcoming-requirements-updates).
- Instagram "Book" button: only for approved partners, and some integrations are paused, so a link in the bio is the realistic route: [Schedulista](https://support.schedulista.com/en/articles/2493738-add-a-book-now-button-to-instagram), [StyleSeat](https://www.styleseat.com/blog/how-to-get-the-instagram-book-button/).
- Google booking links: eligibility depends on country and category: [Google Business Profile countries](https://support.google.com/business/answer/6270107?hl=en), [Appointy on Reserve with Google](https://help.appointy.com/hc/en-us/articles/37069328783257-Which-Countries-Are-Currently-Supported-by-Reserve-with-Google).
- Everything about Wix, Fresha, Booksy and pricing: see the source list in [wix-competitive-analysis.md](wix-competitive-analysis.md).
