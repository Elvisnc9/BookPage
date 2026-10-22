# Wix vs BizConnect (BookPage): competitive research and strategy

_Research date: 20 Oct 2026. "BizConnect" is the working name for the product this repo calls BookPage. Both names mean the same product here._
_Scope: research only. No code was changed. The product facts come from `docs/ARCHITECTURE.md` (snapshot of 17 Oct 2026), `apps/web/src/components/marketing/Pricing.astro` and the session notes for this group of sessions._

## How to read this report

Every finding has one label:

| Label | Meaning |
|---|---|
| **[VC] Verified capability** | An official page or doc confirms the feature exists. |
| **[VL] Verified limitation** | An official page or doc confirms the restriction. |
| **[RC] Recurring complaint** | Two or more independent sources report the same pain. |
| **[EN] Emerging need** | A market shift or new behaviour, backed by evidence. |
| **[H] Hypothesis** | My interpretation. It needs testing with customers. |

Source numbers like **[S12]** point to section 16. Unless a source says otherwise, every source was accessed on 20 Oct 2026. Interpretation always appears under **Interpretation** or **[H]**.

**Evidence caveats you should know up front**
- Reddit could not be fetched directly: my search tool blocks reddit.com. Reddit sentiment therefore reaches this report only second-hand, through articles that quote it, and is weighted down.
- Wix's own plans page returned localised, tax-inclusive prices to my fetcher. The US prices below come from third-party trackers that agree with each other, but they are not first-party.
- Many "Wix alternative" articles are written by competitors such as Trafft, Setora and Koalendar. I use them only where an official doc or a neutral source also supports them, and I say so when I do.
- I found no reliable figures for no-show rates, market sizes or Wix Bookings user counts, so this report gives none.

---

## 1. Executive summary

**Where Wix stands in October 2026.** Wix is no longer just a drag-and-drop builder. In Jan 2026 it launched **Wix Harmony**, an AI builder with an agent called Aria [S1]. In Aug 2026 it launched **Symphony**, a standalone multi-agent system for small businesses [S3], and in Oct 2026 it connected Symphony to Stripe's agent wallet [S4]. **Wix Bookings** is mature: appointments, classes and courses; staff; booking policies; cancellation and no-show fees charged to saved cards; per-service deposits; SMS reminders; multi-service appointments; and Reserve with Google [S7–S13]. In head-to-head features BookPage cannot catch up, and it should not try.

**Where Wix verifiably leaves room:**
1. **Taking bookings costs money on Wix.** A free Wix site can display services but cannot accept bookings, and booking payments need a plan that accepts payments [S14]. Third-party trackers put the cheapest such plan, Core, at about $29/month billed annually [S2]. BookPage already takes unlimited bookings for free.
2. **The no-show tooling has gaps.** Deposits are "not yet available for all users" and cannot be combined with manual approval [S8]. Appointment waitlists are manual [S11]. When a client cancels a paid single session, the refund is not automatic [S9]. Setting up a cancellation fee works on desktop only [S10].
3. **Wix's AI for customer conversations keeps changing.** AI Site Chat could no longer be installed on new sites from Mar 2026 [S15]. The Front Desk Agent is unsupported from Oct 2026 [S16]. The AI Phone Agent is US-only and English-only, and it does not create bookings [S17]. For a European business, Wix has no native AI that books by phone or chat today.
4. **Trust and cost complaints recur.** Auto-renewal charges and refused refunds come up again and again on Trustpilot [S20]. Leaving Wix effectively means rebuilding the site [S21, S22]. Harmony's AI sites usually need substantial manual fixing [S23–S25].

**The other competitors' weak spot:** Fresha and Booksy charge 20–30% commission on "new" marketplace clients, and owners repeatedly dispute how those clients are attributed [S29–S33]. Fresha's free tier is reported to have ended in 2026 [S29, S30]; that evidence is weak and needs confirming.

**What BookPage has today:** a free hosted booking page with 11 templates, no-JS booking, a guarantee against double bookings in the database itself, email confirmations and reminders, cancel links, enquiries for quote-only work, and an owner dashboard. It has **no** payments or deposits, no reschedule link, no SMS or WhatsApp, no calendar sync, no AI, no custom domains, no per-staff schedules, and nothing to bill for Pro.

**Recommendation in one line.** Own **"from DM to a confirmed, no-show-protected appointment in one link, free to start, no commission, set up in 10 minutes"** for **solo and small-team (1–5 person) beauty and grooming professionals in the EU, UK and US** whose clients arrive through Instagram, WhatsApp and Google. Build deposits through Stripe Connect, a reschedule link, rebooking nudges, a share kit and an owner app that works on a phone first. Test AI reply drafts and paid SMS or WhatsApp before building them. Postpone site-builder breadth, marketplaces and POS.

---

## 2. Wix capability analysis (current, Oct 2026)

### 2.1 Website creation, templates, publishing
- **[VC]** **Wix Harmony** (launched 21 Jan 2026) combines natural-language generation with visual editing. Its agent, **Aria**, edits the site through prompts [S1]. Wix says it will gradually make Harmony the default for new and existing users [S1b]. Classic Editor sites cannot be converted to Harmony (third-party report) [S1c].
- **[VC]** There is a large template library, a free plan on a wixsite.com subdomain with Wix ads, and paid plans that connect a custom domain and include a free domain for a year [S2].
- **[RC]** Harmony output needs significant manual fixing. Testers report broken layouts and mobile views, placeholder pages, paragraphs styled to look like headings (bad for SEO and accessibility), unrelated stock images, repetitive designs, an AI that claims fixes it didn't make, and edits that lag in the editor [S23, S24, S25]. One hands-on review was positive about speed: about 5 minutes to a draft [S24].
  - _Evidence strength: medium._ Several independent testers report it, but some are agencies with an interest. Wix itself warns that "AI can make mistakes".

### 2.2 Wix Bookings
- **[VC]** Appointments, classes and courses; staff; and booking policies covering cancel and reschedule windows, late-booking cut-offs, and whether members or all visitors can reschedule [S10, S11].
- **[VC]** **Cancellation and no-show fees**, fixed or a percentage, with up to three time windows. They are charged to a card saved at checkout through Wix Payments, PayPal, Stripe and some others [S10, S12]. **[VL]** They can't be charged to wallets or buy-now-pay-later, can't be applied to refunded orders or to part of a group booking, and can only be set up on desktop [S10].
- **[VC]** **Deposits** can be set per service: "online deposit, rest in person" [S8]. **[VL]** The feature is "not yet available for all users", can't be combined with manual approval, and once a deposit is on, clients can't choose to pay the full amount up front unless the owner allows it [S8].
- **[VC]** Owners can refund from Orders or the owner app, including partial refunds [S9]. **[VL]** A feature request still open on the help centre says a client cancelling a paid single session is not refunded automatically; the owner has to process it [S9b]. Third-party apps exist to automate this [S9c].
- **[VC]** **Class waitlists**, with capacity and a hold time for released spots [S11]. **[VL]** **Appointment waitlists are manual**: nobody is notified when a slot opens [S11b].
- **[VC]** **SMS reminders** go out 24 hours before and use an SMS quota [S13]. **[VL]** The text and sender can't be customised, and SMS is off by default [S13]. Bookings plans include message allowances (reported as 0/50/100/250/5,000 by tier, but the tier names in that source don't match the current plan names, so this is weak evidence) [S13b].
- **[VC]** **Reserve with Google**: services, prices and availability appear in Google Search and Maps, synced about every 30 minutes. Choosing a time slot inside Google was initially limited to beauty services. Google approves each business, which can take up to two weeks, and a premium plan is required [S18, S18b].
- **[VC]** **Multi-service appointments**, POS (point of sale) and in-person payments [S8, S12].
- **[VL]** **A free site cannot take bookings**; an upgrade is required [S14].
- **[RC]** Wix Bookings has historically been rigid for salons: fixed session lengths, limited form fields, no off-peak pricing, and the booking widget limited to one page and no multilingual setup [S26, S27, S28]. _Evidence strength: low to medium._ The sources are partly a competitor (Trafft) and partly a year or more old, so some points may be fixed. Multi-service appointments now exist [S12].

### 2.3 Customer relationship management (CRM), messaging, automations, AI agents
- **[VC]** **Wix Automations** builds trigger → delay → action flows. Booking confirm, cancel and reschedule emails are on by default. Wix's own guidance suggests follow-ups and "we miss you" flows [S19].
- **[VL]** Promotional and custom automation emails count against a monthly email quota: **200 per month free** without an upgrade. Transactional emails generally don't count [S19b].
- **[VC]** **Smart Chat** (AI answers from site content plus live chat) replaces AI Site Chat. AI Site Chat could no longer be installed on new sites from Mar 2026 [S15].
- **[VL]** The **Front Desk Agent** is unsupported "starting October 2026" [S16].
- **[VC/VL]** The **AI Phone Agent** answers calls, transcribes them and texts booking links. It is **US-only and English-only**, does **not** create bookings, and uses shared AI credits [S17].
- **[VC]** **Symphony** (11 Aug 2026) is a standalone multi-agent product with an orchestrator. Third-party reviews describe an agent for appointments and calendars. Pricing is credit-based, and sources disagree on the tiers [S3, S5, S6].
- **[EN]** Wix is moving its AI from "a chat widget on your site" to "agents that run the business", and those agents work even without a Wix site [S3, S4]. **Interpretation:** "an AI receptionist" alone will not differentiate BookPage for long.

### 2.4 Payments and regions
- **[VC]** **Wix Payments** works in 15 countries, including the US, UK, Canada and most large EU markets (AT, BE, FI, DE, IE, IT, LT, NL, PT, ES, CH) [S35]. Elsewhere, third-party providers such as Stripe, PayPal and Mollie connect [S35b].
- **Interpretation:** for **EU and US** businesses, "Wix can't take payments in my country" is **not** a meaningful gap. I am not counting it as a Wix weakness.

### 2.5 Analytics, mobile, SEO, performance, accessibility
- **[VC]** Wix has an owner mobile app that handles bookings, POS, refunds and policies [S9, S12].
- **[VC]** On mobile Core Web Vitals, Wix scores high in 2026 field data: about 79–81% of sites pass, ahead of Squarespace at about 70% [S36, S37]. **Do not position against Wix on speed in general.** BookPage's no-JS booking pages are probably faster still, but that is **[H]** until measured.
- Accessibility: I found no independent 2026 audit, so I make no claim either way.

### 2.6 Pricing and add-ons (US, billed annually; third-party, consistent across sources)
- Light about $17/mo, Core about $29/mo (the cheapest tier for selling services), Business about $39/mo, Business Elite about $159/mo. Billing monthly costs more [S2]. These are converging trackers, not first-party.
- Common extras: domain renewal after year 1, email mailboxes, SMS top-ups, premium apps, AI credits and payment fees [S2b, S13, S17].
- **[RC]** Staff in Bookings count as site collaborators, and some users report hitting collaborator limits that force an expensive plan jump [S38]. _Evidence strength: low._ This is from forum threads in 2024–2025, and the limits may have changed.

### 2.7 Support and onboarding
- **[RC]** Billing and renewal disputes, and refunds refused under policy, recur on Trustpilot (3.5/5 from about 27k reviews as displayed when accessed; Wix replies to most negative reviews) [S20, S20b]. _Evidence strength: medium._ The reviews are unverified, but the pattern repeats across 2026 and across country versions of Trustpilot.
- **[RC]** A hands-on Bookings review says staff working hours can silently hide availability, and recommends a test booking before paying [S27].

---

## 3. Verified limitations and pain points

| # | Pain | Label | Evidence | Strength | Has Wix fixed it? |
|---|---|---|---|---|---|
| P1 | Booking needs a paid plan; a free site can only show services | VL | S14 | Strong (official) | No |
| P2 | Deposits not available to every user; can't be combined with manual approval | VL | S8 | Strong (official) | Partly. Deposits exist. |
| P3 | Refunds on client cancellation are manual for paid single sessions | VL (open feature request) | S9b, S9c | Medium | Not as of the request page |
| P4 | Appointment waitlists are manual | VL | S11b | Strong | No (class waitlists exist) |
| P5 | Cancellation-fee setup is desktop-only; no wallets or buy-now-pay-later | VL | S10 | Strong | No |
| P6 | AI messaging tools keep changing; the phone agent is US/English only and doesn't book | VL | S15, S16, S17 | Strong | It's in flux, with Symphony as the bet |
| P7 | AI-generated sites need heavy manual fixing | RC | S23, S24, S25 | Medium | Wix is iterating |
| P8 | Renewal charges and refused refunds | RC | S20, S20b | Medium | No |
| P9 | Migration means a rebuild; members can't be exported | RC + VL | S21, S22, S21b | Medium-strong | No |
| P10 | Costs pile up: plan + domain renewal + SMS + apps + AI credits | RC | S2b, S13, S17, S28 | Medium | No |
| P11 | Booking setup gotchas: staff hours hiding slots, limited form fields | RC | S27, S26 | Low-medium (partly old) | Partly |
| P12 | Staff count as collaborators, so plan limits bite | RC | S38 | Low | Unknown |
| P13 | Regional payment limits in EU/US | **Not a gap** | S35 | Strong | — |
| P14 | Slow pages in general | **Not a gap** (Wix leads on CWV) | S36, S37 | Medium | — |

**Isolated complaints I do not treat as patterns:** the booking form questions can't be edited; only one calendar syncs [S27b]; the platform froze when following a link (Capterra, 2017-era) [S28].

---

## 4. Booking-journey friction (Wix, end to end)

C = customer, O = owner.

| Stage | Wix today (verified) | Friction or abandonment risk | Label | BookPage today |
|---|---|---|---|---|
| Discover | Google Search/Maps via Reserve with Google; SEO; Wix site | RwG needs Google approval (up to 2 weeks), and slot booking inside Google started with beauty only [S18b]. Most solo pros get found on Instagram/TikTok and WhatsApp, not their website **[H]** | VC / H | Subdomain page; no RwG; no share kit |
| Business page | A full website, often generated by AI | AI drafts need fixing (P7). O spends hours before launch | RC | 11 templates; preview equals live page; 5-step onboarding |
| Understand services | Service pages and a calendar widget | Off-peak pricing and variable durations are limited (older evidence) | RC (weak) | Services with fixed/from/quote/free pricing; quote-only → enquiry |
| Choose service/staff/location | Supported, plus multi-service | Staff hours misconfigured → no slots shown [S27] | RC | "Anyone" or a named person; **everyone does every service**; no per-staff hours |
| Date and time | Calendar | — | — | 14 days of slots shown, no JS; booking window up to 365 days |
| Details | Booking form; site membership for some actions | Members-only cancel/reschedule if configured [S10] | VC | Name + email (+ phone/note set per business); no account |
| Deposit or payment | Full, deposit, or in person; card saved for fees | Deposit not available to all users; deposit + approval not allowed; no wallets for fees [S8, S10] | VL | **None** |
| Confirmation | Email (SMS optional) | — | — | Email + .ics; "request sent" when approval is required |
| Reminders | SMS 24h before (quota; text fixed); email via automations | SMS costs extra; text not customisable [S13] | VL | Email the day before (with consent) |
| Reschedule / cancel | Policy-based self-service | Refund on cancel is manual [S9b]; fees only to saved cards | VL | **Cancel only**; no self-service reschedule; no fees |
| Freed slot | Class waitlist only | Appointment slot stays empty unless O acts [S11b] | VL | Nothing |
| Attend | POS, mark attended | — | — | Mark complete / no-show |
| Follow-up and rebooking | Automations (build your own flow; 200 promo emails/mo free) | O must design it; quota [S19, S19b] | VC + VL | Nothing |
| Support / leave | Help centre; renewals | Renewal disputes; migration = rebuild [S20, S21] | RC | Free tier; no export yet |

### Fit by vertical (interpretation, **[H]** unless marked)

| Vertical | What they need most | Wix fit | Underserved need BookPage could own |
|---|---|---|---|
| Salons, lash, nails, brows | Deposits, no-show fees, rebooking cadence, Instagram link, per-stylist services | Good but heavy; fees desktop-only; specialist tools (Fresha, Booksy) dominate, with commissions | **Strong.** Commission-free and phone-first, with deposits |
| Barbers | Fast rebooking, walk-in plus booking, low price | Over-built | **Strong** (rebook nudges, link in bio), but Booksy/Squire are entrenched |
| Spas and massage | Deposits, intake forms, gift cards | Good (forms, gift cards via apps) | Medium (intake forms needed) |
| Photographers | Enquiry → quote → deposit → date; portfolio | Good portfolio site; booking is secondary | Medium. The enquiry flow exists; quote-to-deposit is missing |
| Tutors | Recurring sessions, packages, parent contact | Courses and plans exist | Medium-low (recurring and packages needed) |
| Consultants | Calendar sync, video links, paid calls | Calendly/Acuity are better fits | **Low.** Calendly wins |
| Repair / mobile trades | Service areas, quotes, arrival windows | Weak fit | Medium. Service areas and quote flow exist; arrival windows don't |
| Fitness trainers | Classes, packages, memberships | Wix classes, waitlists and plans are strong | Low for classes; medium for 1:1 PTs |

---

## 5. Comparison table

Prices are US list prices billed annually unless noted. They come from the cited sources and change often.

| | Wix | Squarespace + Acuity | Calendly | Fresha | Square Appointments | Booksy | Vagaro | GoDaddy (Airo) | **BookPage today** |
|---|---|---|---|---|---|---|---|---|---|
| Website | Full builder + AI (Harmony) | Full builder | Booking page only | Marketplace profile | Free booking site | Marketplace profile | Profile; website add-on | AI builder | **Hosted booking page, 11 templates** |
| Booking on free tier | **No** [S14] | No (Acuity paid) [S40] | 1 event type [S41] | No (free tier reportedly ended 2026) [S29, S30] | Yes, 1 staff/1 location [S43] | No | No | Booking in plans; payments need Premium [S44] | **Yes, unlimited** |
| Entry price | ~$29/mo to sell services [S2] | Site $16–23 + Acuity $16–55 [S39, S40] | $10/seat/mo (monthly billing) [S41] | ~$19.95/mo solo; $14.95 per member [S29] | Free; Plus/Premium (prices conflict) [S43] | $29.99 + $20 per staff [S31] | $23.99 promo / ~$30 + $10 per calendar [S32] | ~$10–24/mo (sources conflict) [S44] | **$0; Pro $15 waitlist only** |
| Commission on new clients | None | None | None | **20% of first visit, $6 min** [S29] | None | **30% Boost, capped** [S31] | None | None | **None** |
| Deposits / no-show fees | Yes, with limits [S8, S10] | Yes (Acuity) | Payments on paid plans | Yes | Yes (online 2.9% + 30¢) [S43] | Yes | Yes | Payments on Premium | **No** |
| SMS / WhatsApp | SMS quota | SMS on Standard+ [S40] | Reminders on paid | SMS metered [S29] | Yes | Yes | Text add-on | — | **Email only** |
| AI for customers | Smart Chat; phone agent US/EN; Symphony | Acuity AI Booking Assistant (Premium) [S40] | — | — | — | — | — | Airo | **None** (FAQ data ready) |
| CRM / rebooking | Automations, contacts | Basic | — | Client profiles, marketing | Client profiles | Marketing | Marketing | Email marketing | **Customer table only, no UI** |
| EU/US availability | Both | Both | Both | Both (+UK) | US, UK, IE, FR, ES, CA, AU, JP (not verified here) | US, UK, PL, others | US, UK, CA, AU | Both | **Both by design** |
| Setup ease | Heavy (site + Bookings + payments) | Two products | Very easy | Moderate | Easy | Moderate | Moderate–heavy | Easy | **Easy (5 steps, autosave)** |
| Leaving / lock-in | Rebuild [S21] | — | Low | Client data in a marketplace | — | Marketplace | — | — | **No export yet** |

**Where each does well and where customers still struggle**
- **Squarespace + Acuity:** Acuity is a deep, mature scheduler (waitlists and packages on Standard; AI Booking Assistant and HIPAA on Premium) [S40]. **Struggle:** two subscriptions and two setups [S39, S40].
- **Calendly:** the simplest for one-to-one meetings. **Struggle:** not built for service menus, deposits per service or local services. Payments need a paid plan [S41].
- **Fresha / Booksy:** deep features for salons plus the demand their marketplaces bring. **Struggle:** commissions and disputed attribution; slow support; payout holds (Fresha UK threads) [S30, S33, S34]. These are owner-reported complaints, partly via competitor blogs.
- **Square Appointments:** generous free tier, strong POS. **Struggle:** the free tier is limited to 1 staff member and has no Google Calendar sync; plan prices are reported inconsistently [S43].
- **Vagaro:** per-calendar pricing, and extra staff are free above 7 calendars. **Struggle:** many paid add-ons (texts, forms, website) [S32].
- **GoDaddy Airo:** cheap and quick to set up. **Struggle:** generic AI designs; no app market [S44].

---

## 6. Ranked opportunities

Each opportunity is scored 1–5 on five criteria. For effort and operational risk, 5 means low effort or low risk, so a higher total is always better. The maximum total is 25.

| Rank | Opportunity | Cust. impact | Differentiation | Effort (5 = low) | Op. risk (5 = low) | Commercial | Total | Bucket |
|---|---|---|---|---|---|---|---|---|
| 1 | **Deposits + simple no-show policy** via Stripe Connect (US/EEA/UK) | 5 | 3 | 2 | 3 | 5 | 18 | **Build now** |
| 2 | **Self-service reschedule link** (today the link only cancels) | 4 | 2 | 4 | 5 | 3 | 18 | **Build now** |
| 3 | **Share kit**: link-in-bio, QR, WhatsApp/Instagram message templates, Google Business "book" link | 4 | 3 | 5 | 5 | 3 | 20 | **Build now** |
| 4 | **Rebooking nudges** (an interval per service, e.g. 6 weeks after a cut) | 4 | 4 | 4 | 4 | 4 | 20 | **Build now** |
| 5 | **Phone-first owner app** (PWA (installable web app), push or email, one-tap approve, add a booking) | 4 | 2 | 3 | 4 | 3 | 16 | **Build now** |
| 6 | **Client list + CSV export + GDPR erase UI** (the "your clients are yours" promise) | 3 | 4 | 4 | 5 | 3 | 19 | **Build now** |
| 7 | **Automatic appointment waitlist** (fills a freed slot) | 4 | 4 | 3 | 3 | 3 | 17 | **Test first** |
| 8 | **AI reply drafts from approved FAQs** (owner approves; text-first; multilingual) | 4 | 3 | 3 | 2 | 4 | 16 | **Test first** |
| 9 | **WhatsApp/SMS reminders** (paid, metered) | 4 | 2 | 3 | 2 | 4 | 15 | **Test first** |
| 10 | Per-staff hours and services | 3 | 1 | 3 | 4 | 3 | 14 | Test first (for teams) |
| 11 | Custom domains (Cloudflare for SaaS) | 2 | 1 | 3 | 3 | 4 | 13 | Test first (as a Pro lever) |
| 12 | Two-way Google Calendar sync | 3 | 1 | 2 | 3 | 3 | 12 | Wait / test |
| 13 | Reserve with Google partnership | 3 | 2 | 1 | 2 | 3 | 11 | **Wait** |
| 14 | AI site generation / free-form editor | 2 | 0 | 1 | 2 | 2 | 7 | **Avoid** |
| 15 | Marketplace / discovery app | 3 | 1 | 1 | 1 | 3 | 9 | **Avoid** for now |

---

## 7. Differentiation strategy (six strategies)

### Strategy 1: "Bookings are free, forever" as the wedge
- **Problem and evidence:** Every general-purpose builder charges before the first booking. Wix needs a paid plan to accept bookings [S14] (about $29/mo Core [S2]). Acuity starts at $16–20/mo [S40]. Fresha's free tier reportedly ended in 2026 [S29, S30] (weak evidence). Square is the exception: free for 1 staff member [S43].
- **How Wix handles it:** a free site can show services, but customers can't book them.
- **Verified gap:** a free, branded, bookable page with no commission, among general-purpose website tools.
- **BizConnect's answer:** keep unlimited free bookings, with the BookPage badge as the cost. This already exists in the repo.
- **Capabilities needed:** cheap hosting per tenant (Cloudflare Workers already does this); R2 for images (move off Postgres bytea); a shared Redis or Durable Object for rate limits (in-memory counters only work for one API instance, per ARCHITECTURE §9).
- **Complexity:** low. **Commercial value:** acquisition rather than revenue; revenue comes from strategies 2, 4 and 5. **Durability:** low on its own, because Wix or Square could copy it. It lasts only combined with the other strategies. **Metrics:** sign-up → published page rate; median minutes to publish; share of pages with ≥1 booking within 14 days.

### Strategy 2: No-show protection that works on day one
- **Problem and evidence:** Every serious competitor sells deposits and no-show fees, and GoDaddy promotes payments "to reduce last-minute cancellations and no-shows" [S44b], so owners clearly care about this. I have no reliable figure for no-show rates and give none.
- **How Wix handles it:** per-service deposits (not for all users; not combined with approval) [S8]; fees charged to saved cards (desktop-only setup; no wallets) [S10]; manual refunds for paid single-session cancellations [S9b]; manual appointment waitlist [S11b].
- **Verified gap:** a single, readable policy that **runs itself**: the deposit is taken; automatic refund or forfeit by time window when the customer cancels with the link; the freed slot is offered to a waitlist. All of it set up from a phone.
- **BizConnect's answer:** a policy picker with three presets ("Flexible / Standard / Strict"), each showing the exact customer-facing text. Deposits as a fixed amount or a percentage. Cancel and reschedule links apply the policy automatically. Approval-required bookings may still take a deposit, using an authorisation that is captured when the owner approves. Wix doesn't allow deposit plus approval today [S8].
- **Capabilities needed:** Stripe Connect (accounts the connected business controls; Stripe collects its processing fees from them); PaymentIntents with `capture_method=manual` (expiry windows apply; verify the per-method limits); webhooks; a `payments` table linked to `bookings`; policy snapshots on each booking (consistent with the existing price snapshot); Stripe refunds API.
- **Complexity:** medium-high (payments, compliance, webhooks, disputes). **Commercial value:** high. It justifies Pro and can carry a small platform fee. **Durability:** medium. The lasting advantage is getting the defaults right, with no configuration, rather than the feature itself. **Metrics:** % of active businesses with deposits on; no-show rate before and after (self-reported plus `no_show` status); deposit collection success rate; disputes per 1,000 payments.

### Strategy 3: "Your clients stay yours": no commission, real export, honest billing
- **Problem and evidence:** Owners dispute Fresha's and Booksy's charges on clients they consider their own [S29–S34]. Leaving Wix means a rebuild, and members can't be exported [S21, S21b, S22]. Wix renewal disputes recur [S20].
- **How Wix handles it:** contacts can be exported; members can't; the site itself can't [S21b, S22].
- **Verified gap:** a tool that is commission-free and portable, and **says so contractually**.
- **BizConnect's answer:** a "Your data, your clients" promise on the pricing page. One-click CSV/JSON export of clients, bookings and services. No marketplace, so no attribution disputes. Monthly billing only, with an email 7 days before any charge, and cancel in one click.
- **Capabilities needed:** export endpoints (owner-scoped); billing (Stripe Billing) with pre-renewal emails; an anonymisation UI (the data model already supports `anonymized_at`).
- **Complexity:** low. **Commercial value:** medium. It helps conversion and retention trust. **Durability:** medium-high, because marketplaces can't adopt this without hurting their own model. **Metrics:** NPS verbatims mentioning trust or price; churn reasons; how often export is used (expect low use but high reassurance).

### Strategy 4: The rebooking loop (repeat business without marketing tools)
- **Problem and evidence:** Wix suggests rebooking and "we miss you" automations but leaves the owner to build them [S19], and promotional emails are capped at 200/mo on the free allowance [S19b]. That clients come back on a cadence (cuts, lashes, nails) is **[H]**, and widely assumed.
- **Verified gap:** rebooking that **needs zero setup**, driven by the service itself.
- **BizConnect's answer:** each service gets a "come back after" interval with an industry default (for example cut 5–6 weeks, lash fill 2–3 weeks; to be validated). After a visit is marked `completed`, the customer gets one email (later WhatsApp) with a one-tap link to the same service, person and time of day. The owner can switch it off. Consent is recorded the way reminders already are.
- **Capabilities needed:** a new service field; a cron job (extend `reminders/`); idempotent sends using the existing conditional-claim pattern; a deep link pre-filled into `/book`; an email template; a consent flag separate from reminders (ePrivacy/GDPR: rebooking prompts may count as marketing; get legal review).
- **Complexity:** low-medium. **Commercial value:** high. It ties revenue to a feature the owner can see, which makes it a strong Pro feature. **Durability:** medium. Its edge comes from industry defaults plus outcome data. **Metrics:** rebooking rate within the interval; bookings that come from nudges.

### Strategy 5: The AI front desk that only says what you approved (text-first, multilingual, EU-ready)
- **Problem and evidence:** Wix's conversational AI keeps changing (AI Site Chat closed to new sites from Mar 2026; Front Desk Agent sunset Oct 2026) [S15, S16]. Its phone agent is US/English only and doesn't book [S17]. Third-party phone receptionists cost $49–$99/mo (vendor pages) [S45]. **[EN]** Wix's Symphony shows the market moving to agents [S3]. **[H]** Small EU and US owners answer the same WhatsApp and Instagram questions all day ("price?", "availability Saturday?", "parking?").
- **Verified gap:** for **non-US, non-English** small businesses, Wix has no native AI that books; its US one doesn't create bookings either.
- **BizConnect's answer:** start with **reply drafts, not autonomy**. The owner pastes a customer's message, or forwards it from email at first. The AI drafts an answer using only approved FAQs, services, prices, hours and **live availability**, plus a booking deep link. The owner taps send. Upgrade to auto-replies on the booking page later, once accuracy is measured.
- **Capabilities needed:** the FAQ editor in onboarding (missing today: the API exposes approved FAQs, but onboarding has no editor); a retrieval layer over business data; an availability tool that calls the engine; guardrails against inventing prices or making promises; per-business usage limits; logging for review. The WhatsApp Business API comes later (per-conversation fees and Meta approval).
- **Complexity:** medium. **Commercial value:** high (an AI usage tier). **Operational risk:** high (hallucination, liability, AI Act transparency obligations; disclose that it is AI). **Durability:** medium. Grounding answers in live availability and approved facts is harder to copy than a generic chatbot. **Metrics:** draft acceptance rate unedited; median response time; bookings from AI links; flagged errors per 100 replies.

### Strategy 6: Industry presets so setup takes ten minutes
- **Problem and evidence:** Wix setup has gotchas (staff hours hide availability) [S27]. Harmony drafts need heavy fixing [S23–S25]. Acuity plus a website means two setups [S39, S40].
- **Verified gap:** general builders make the owner design the site, then configure booking. No general builder ships **operational** defaults per industry: durations, buffers, deposit policy, rebooking interval, intake questions.
- **BizConnect's answer:** choosing a category (the `category` enum already exists) pre-fills services, durations, buffers, a deposit preset, a rebooking interval, customer fields and a template. The owner edits prices and publishes.
- **Capabilities needed:** a preset data table (versioned, like `site_templates`); onboarding prefill; checks that presets pass the existing DB constraints.
- **Complexity:** low. **Commercial value:** medium (activation). **Durability:** low-medium, but it compounds with data from real businesses. **Metrics:** time to publish; % of presets kept vs edited; first-week bookings.

**Strategies I considered and rejected:** an AI website generator (Wix's core strength; P7 shows even Wix struggles); a marketplace (it fights strategy 3); POS hardware (Square's ground); and calendar-sync-first (Calendly's ground). None of these matches a gap BookPage can win.

---

## 8. Initial target segments

1. **Primary: solo and micro beauty/grooming pros (1–5 people) in the US, UK, IE, NL, DE, ES and FR.** Lash and brow artists, nail techs, independent hair stylists, barbers, home-studio aestheticians. Clients come from Instagram, WhatsApp and Google. Pain: no-shows, endless DMs, commissions. **[H]** Strongest fit for strategies 2, 3, 4 and 5. Note: EU fit varies by country; local methods such as iDEAL (NL) and Bancontact (BE) matter (see §11).
2. **Secondary: mobile and home services working on quotes** (cleaners, mobile mechanics, mobile massage, photographers). They need the existing enquiry → quote flow, plus "quote → deposit → date" (later).
3. **Not now:** class-based fitness studios (Wix, Mindbody and Vagaro are strong); consultants (Calendly); multi-location chains (they need per-location and per-staff logic).

---

## 9. Prioritised MVP features (next 90 days)

**Build now** (each ties to a strategy and to a current gap in the repo)
1. **Stripe Connect onboarding plus deposits** for the US, EEA and UK: a fixed or percentage deposit per service, and three policy presets. Charge the deposit at booking, or authorise it for approval-required bookings. Automatic refund or forfeit on customer cancel by time window. (S2)
2. **Reschedule via the manage link** (the cancel token exists; add `/booked/{id}/reschedule` that re-runs the engine; the policy decides whether it's allowed). (S2)
3. **Share kit:** link-in-bio copy, QR code (PNG/SVG), WhatsApp and Instagram message templates, a "Book" button snippet, Google Business Profile booking-link instructions. (S1)
4. **Rebooking nudge** per service. (S4)
5. **Phone-first owner experience:** PWA install, booking alerts, one-tap approve/decline, "add a booking" (the `source=owner` model exists; check the UI), the day's list. (S1/S2)
6. **Client list + export + erase** in the dashboard. (S3)
7. **Industry presets** in onboarding. (S6)
8. **Platform hardening that payments depend on:** R2 for images, shared rate-limit storage, production secrets (ARCHITECTURE §9 launch checklist), a webhook queue, and audit logs for money events.

**Test with customers first**
- AI reply drafts (a concierge pilot first: humans plus an LLM behind the scenes, before building a product).
- WhatsApp or SMS reminders as a paid add-on: check willingness to pay and the Meta/Twilio unit economics per country.
- An automatic appointment waitlist.
- Per-staff schedules and service assignment (only if teams of 3+ are a big share of sign-ups).
- Custom domains as a Pro lever.
- A "Pro" bundle and price point (the current $15 claim; see §11).

**Wait**
- Two-way Google Calendar sync (high demand from solo pros working across jobs, but OAuth verification and sync edge cases are costly; start with an .ics feed **[H]**).
- Reserve with Google (partner integration; Google reviews it; heavy).
- Packages, memberships, gift cards, classes.
- Several businesses per owner.

## 10. What to postpone or avoid
- **Avoid:** an AI website builder or free-form editor; a marketplace with commission; POS hardware; e-commerce; "feature parity" lists against Wix.
- **Postpone:** a native mobile app (a PWA first); multi-location; phone AI (voice) until text AI is proven; anything that needs HIPAA (medical aesthetics in the US).
- **Don't promise until it's built:** the current pricing page lists "Deposits and online payments", "WhatsApp reminders", "Your own domain" and "AI receptionist" under "coming soon". Keep each of them out of "Pro" until it ships.

---

## 11. Pricing model

### 11.1 Options compared

| Model | Who uses it | Pros | Cons for BookPage |
|---|---|---|---|
| Free hosted page + paid upgrade | Square (free tier), Calendly (free) [S41, S43] | Easy to acquire; matches what exists | Free users cost money (email, images, support) |
| Flat subscription | Wix, Squarespace, Acuity [S2, S39, S40] | Predictable | Must beat "free" Square and justify itself against Wix |
| Per-staff / per-calendar | Fresha, Booksy, Vagaro [S29, S31, S32] | Grows with the business | Punishes growth; solo pros don't care |
| Commission on new clients | Fresha 20%, Booksy 30% [S29, S31] | Revenue without a subscription | **The main complaint** in this space; conflicts with strategy 3 |
| Transaction / platform fee on payments | Square margin, GoDaddy rates [S43, S44] | Revenue tracks value delivered | Must stay small and visible |
| Paid AI usage | Wix AI credits, Symphony [S5, S17] | Matches LLM costs | Hard for owners to predict |
| Custom domain as a paid perk | Wix (Light+), most builders [S2] | Clear upgrade reason | Low intent among solo pros **[H]** |

### 11.2 Payment providers (Europe and US)
- **Stripe** standard pricing: **US** 2.9% + 30¢ domestic; +1.5% international cards; +1% currency conversion [S46]. **Ireland/EEA**: 1.5% + €0.25 standard EEA cards; 2.8% + €0.25 premium EEA; 2.5% + €0.25 UK cards; 3.15% + €0.25 international (+2% conversion); SEPA Direct Debit €0.35; Klarna from 4.99% + €0.40 [S47]. Local methods (iDEAL, Bancontact and others) are priced per method [S47].
- **Stripe Connect:** with **"Stripe handles pricing"**, the platform pays no fee per account or per payout. With **"You handle pricing"**: **$2 per monthly active account + 0.25% + 25¢ per payout**, plus 0.25% for funds routing [S48]. Express accounts are labelled legacy for new integrations in current docs, so evaluate the newer account configuration [S49].
- **Country coverage:** Connect platforms in the US, UK, EEA and CH can pay out to connected accounts across those regions [S49]. That covers BookPage's market.
- **Mollie** (EU-native): cards reported around 1.8% + €0.25–0.29; iDEAL about €0.29–0.32; Connect supports application fees or resale pricing [S50]. _Third-party rates; confirm with Mollie._ It is useful if NL/BE merchants push back on Stripe's iDEAL/Bancontact UX or pricing, but it adds a second integration.
- **Recommendation:** **Stripe Connect only**, with Stripe-handled pricing (connected accounts pay Stripe directly, Stripe deals with disputes and KYC, no $2/account fee). Add a small **application fee** where the plan model calls for one (below). Revisit Mollie only if Benelux uptake is weak.

### 11.3 Recommended starting model (**[H]**, test before committing)
- **Free, €0/$0:** unlimited bookings, subdomain, 11 templates, email confirmations and reminders, cancel/reschedule, client export, BookPage badge. **Deposits allowed on Free with a 1.5% platform fee on deposit volume** (Stripe's processing on top), so the free tier pays for itself in proportion to value.
- **Pro, ~€12/$15 per month, flat per business, up to 5 staff:** no badge, **0% platform fee**, rebooking nudges, waitlist, AI reply drafts (a fair-use allowance), custom domain, a bundled WhatsApp/SMS allowance (country-limited, priced after the unit-economics test), priority support. Billed monthly, with a 7-day pre-charge email.
- **Add-ons later:** extra messages, AI beyond fair use.
- **Why:** it keeps the "free forever" wedge (strategy 1), avoids commissions (strategy 3), earns money where value appears (deposits), and gives owners a simple reason to upgrade (save the fee and get the time-saving features).
- **What I don't recommend:** per-staff pricing at launch; commission on clients; annual-only plans.
- **Note:** the live pricing page sells Pro as "more templates, colours, logo, video, gallery". The code makes all templates free (`isPremium=false`). The evidence here suggests owners pay for **filled chairs and fewer no-shows**, not for looks **[H]**. Test the two Pro pitches against each other (§15).

---

## 12. URL and domain architecture

### 12.1 Options

| | `{slug}.bookpage.app` (current) | `bookpage.app/{slug}` (paths) | Custom domain (`book.glowstudio.com` / `glowstudio.com`) |
|---|---|---|---|
| Brand / trust | Good; reads as "their page" | Reads as a profile on a platform | Best |
| Tenant isolation | **Separate origin per tenant** (cookies, storage, CSP) | **One shared origin**: a tenant's content shares cookies and storage with everyone else's | Separate origin |
| SEO | Each subdomain gets its own signals; the platform's authority doesn't pass on | Pages share the platform domain's authority, which helps new tenants **[H]** | Owner builds their own authority |
| SSL | One wildcard cert via Cloudflare | One cert | A cert per hostname (Cloudflare for SaaS issues them) |
| Routing | Already built (`middleware.ts` host rewrite) | Simple | Host lookup table + fallback |
| DNS for the owner | None | None | CNAME (subdomain) easy; apex harder |
| Portability | Tied to the platform | Tied to the platform | **Owner keeps the domain** |

### 12.2 Recommendations
1. **Keep subdomains as the default.** They are built, isolated and look branded. Strengthen isolation by **adding `bookpage.app` to the Public Suffix List** (PSL), so browsers treat each `{slug}.bookpage.app` as a separate site for cookies. The current design already uses a host-only `__Host-` cookie on `app.`, but listing the domain on the PSL protects against a tenant-controlled subdomain setting parent-domain cookies in future features. **[H]** (Standard practice for multi-tenant subdomains; check PSL's acceptance criteria and timelines.) Also consider moving the owner app off the tenant suffix (for example `app.bookpage.com` or a separate registrable domain), so tenant pages and the owner session never share a registrable domain.
2. **Keep reserved slugs.** A reserved-word check exists; add brand-safety and phishing words ("login", "paypal", "stripe", "secure", "support"...) and report-abuse handling, because free subdomains attract phishing.
3. **Custom domains via Cloudflare for SaaS** as a Pro feature: **100 hostnames included on Free/Pro/Business zones, then $0.10/hostname/month, up to 50,000**. Custom certificates and **apex proxying are Enterprise-only** [S51]. So:
   - Default to a **subdomain CNAME** (`book.glowstudio.com → customers.bookpage.app`). This works on every DNS provider.
   - Support an apex only where the owner's DNS supports CNAME flattening/ALIAS, or redirect the apex to `www`/`book.` at their registrar.
   - Store `custom_hostname` → business mapping; the middleware resolves Host → slug; keep `{slug}.bookpage.app` working, with a **301 to the canonical custom domain** for SEO; put the canonical URL in emails (`PAGE_URL_TEMPLATE` becomes per-business).
4. **Slug changes:** keep a redirect history table (old slug → business) for at least 12 months **[H]**, so printed QR codes and Instagram links don't break.
5. **Brand domain decision (BizConnect vs BookPage):** "BizConnect" is a generic name that other companies likely already use, and I did not check trademarks or domain availability. **Do not migrate domains until the brand is settled.** The code already isolates the root domain in `ROOT_DOMAIN`/`PAGE_URL_TEMPLATE`, so switching later is mostly config plus redirects. `glowstudio.bizconnect.app` and `glowstudio.bookpage.app` are architecturally identical. Choose on brand clarity: "BookPage" says what it does. Note that `.app` is HSTS-preloaded, so HTTPS is mandatory, which is fine on Cloudflare.

---

## 13. Risks, dependencies and assumptions

| Risk / dependency | Type | Mitigation |
|---|---|---|
| Wix (or Square) offers free bookings or simpler setup | Competitive | Strategies 3–5 hold even if "free" is copied; move fast with a niche |
| Stripe KYC friction slows deposit adoption | Dependency | Deposits optional; "payments later" path; explain KYC in plain language |
| Payment disputes, chargebacks and refund mistakes | Operational | Stripe-handled pricing (Stripe owns dispute fees); policy snapshot on every booking; tests |
| AI giving wrong prices or availability | Operational / legal | Drafts approved by the owner first; answers only from approved data; disclose AI (EU AI Act transparency) |
| WhatsApp/SMS unit costs vary by country | Commercial | Paid add-on; per-country pricing; start with email + WhatsApp click-to-chat |
| GDPR/ePrivacy for rebooking/marketing messages | Legal | Separate consent; easy opt-out; DPA with sub-processors (Neon, Resend, Stripe, Cloudflare) |
| Infrastructure limits listed in ARCHITECTURE §9 (in-memory rate limits, Postgres images) | Technical | Fix before payments go live |
| Free tier attracts abuse/phishing | Operational | Reserved words, reporting, rate limits, takedown process |
| **Assumption:** target owners rely on Instagram/WhatsApp more than websites | **[H]** | Validate in interviews (§15) |
| **Assumption:** owners will pay for no-show tools and rebooking more than for design | **[H]** | Test with pricing-page experiments |
| **Weak evidence:** Fresha free tier ended Jul 2026; Wix SMS tier allowances | Evidence | Confirm on official pages before using in marketing |

---

## 14. 90-day validation and execution roadmap (from 21 Oct 2026)

**Days 0–30: learn and harden**
- 20 owner interviews (§15) across 3 countries (US, UK/IE, NL or ES).
- Fix the launch checklist: secrets, R2 images, shared rate limiter.
- Ship the **share kit** and the **reschedule link**.
- Instrument the funnel: sign-up → publish → first booking → 5th booking; time to publish.
- Run a fake-door pricing test: "Pro: fewer no-shows" vs "Pro: your brand".
- Exit criteria: ≥60% of interviewed solo pros say no-shows or DMs are a top-3 pain; ≥30% would connect Stripe for deposits.

**Days 31–60: deposits plus rebooking**
- Stripe Connect onboarding (US + IE/EEA + UK), deposits, policy presets, automatic refund/forfeit, payment webhooks.
- Rebooking nudges (email).
- Industry presets for 4 categories (hair, barber, lash/brow, nails).
- Concierge AI pilot with 5–10 owners (drafts by a human plus an LLM, not a product yet).
- Exit criteria: ≥40% of active pros in the target segment enable deposits; zero money-handling incidents; nudge bookings ≥5% of total bookings.

**Days 61–90: monetise and decide**
- Open Pro billing (monthly; email before each charge).
- Waitlist automation, if the interviews prioritised it.
- Price test for the WhatsApp reminder add-on (in one country).
- Decide AI draft v1 from pilot data (accuracy ≥95% on approved-fact questions **[H threshold]**).
- Exit criteria: free → Pro conversion among businesses with ≥10 bookings/month; median time to publish ≤15 min; retention of businesses with deposits vs without.

---

## 15. Prioritised customer interviews and experiments

**Interviews** (30 min each; recruit from sign-ups, Instagram and local salons)
1. Solo lash/brow/nail artists who are on Fresha or Booksy now: commission experience, attribution disputes, what would make them move.
2. Solo pros on Wix/Squarespace with booking: setup time, monthly cost, no-show handling, renewal experience.
3. Pros with **no** booking tool (DMs only): how they take bookings, what they would trust.
4. Barbers (US and UK): rebooking cadence, deposits (common or not), walk-ins.
5. Mobile/home services and photographers: the enquiry → quote → deposit flow.

Ask about past behaviour (the last no-show, the last DM thread), not opinions. Collect real numbers (no-shows last month, hours on DMs) as **self-reported** data; never publish them as market statistics.

**Experiments**
| # | Experiment | Metric | Decision it informs |
|---|---|---|---|
| E1 | Pricing-page fake door: "Pro = fewer no-shows" vs "Pro = your brand" | Waitlist click-through by variant | Pro positioning |
| E2 | Deposit opt-in at onboarding (default on vs default off) | % of businesses with deposits; booking conversion | Default policy |
| E3 | Concierge AI replies for 10 owners for 2 weeks | Drafts accepted unedited; owner time saved | Build AI v1 or not |
| E4 | Rebooking email vs none (A/B per business) | Rebook rate within the interval | Rebooking as a Pro feature |
| E5 | WhatsApp reminder price test (€/$ per 100 messages) | Take rate; margin | Add-on pricing |
| E6 | Share-kit usage → bookings from Instagram (UTM) | % of bookings attributed to the share kit | Distribution focus |
| E7 | Custom domain interest among Pro waitlist sign-ups | Requests per 100 Pro sign-ups | Priority of Cloudflare for SaaS |

---

## 16. Source list

All accessed 20 Oct 2026. Publication or update dates are given where the source showed one.

**Wix: official**
- [S1] Wix press release, "Wix Launches Wix Harmony…", 21 Jan 2026. https://www.wix.com/press-room/home/post/wix-launches-wix-harmony-the-ai-website-builder-that-merges-human-and-artificial-intelligence-rein (also GlobeNewswire: https://www.globenewswire.com/news-release/2026/01/21/3222826/0/en/)
- [S1b] Wix Q4 2025 results coverage (Harmony to become the default), Feb 2026. https://finance.yahoo.com/news/wix-com-wix-q4-2025-154703057.html
- [S1c] AlmCorp, "Wix Harmony: Complete Analysis" (2026; third-party; Editor sites can't convert). https://almcorp.com/blog/wix-harmony-ai-website-builder-complete-guide-2026/
- [S3] GlobeNewswire, "Wix Launches Symphony by Wix…", 11 Aug 2026. https://www.globenewswire.com/news-release/2026/08/11/3342741/0/en/wix-launches-symphony-by-wix-a-new-standalone-multi-agent-system-built-for-smbs.html
- [S4] GlobeNewswire, "Symphony by Wix Integrates Link's Wallet for Agents, Built by Stripe", 15 Oct 2026. https://www.globenewswire.com/news-release/2026/10/15/3381745/0/en/
- [S5] Wix blog, "Wix Symphony Pricing". https://www.wix.com/blog/how-much-does-symphony-by-wix-cost
- [S6] Work-management.org, "Wix Symphony Review 2026" (third-party). https://work-management.org/automation/ai-agents/wix-symphony-review/
- [S8] Wix Help, "Wix Bookings: Selecting How You Charge for Bookings Services". https://support.wix.com/en/article/wix-bookings-selecting-how-you-charge-for-bookings-services
- [S9] Wix Help, "Refunding Clients in Wix Bookings". https://support.wix.com/en/article/refunding-clients-in-wix-bookings
- [S9b] Wix Help (feature request), "Refunding clients automatically for cancelled bookings". https://support.wix.com/en/article/wix-bookings-request-refunding-clients-automatically-for-cancelled-bookings
- [S9c] Wix App Market, "Automated Booking Refunds". https://www.wix.com/app-market/joe0630-automated-booking-refunds-1
- [S10] Wix Help, "Charging a Cancellation or No-Show Fee". https://support.wix.com/en/article/wix-bookings-charging-a-cancellation-or-no-show-fee ; "Setting Up Your Booking Policies". https://support.wix.com/en/article/wix-bookings-setting-up-your-booking-policies
- [S11] Wix Help, "Allowing Clients to Cancel or Reschedule Sessions". https://support.wix.com/en/article/wix-bookings-allowing-clients-to-cancel-or-reschedule-sessions
- [S11b] Wix Help (request), "Automatic Appointment Waitlist Management". https://support.wix.com/en/article/wix-bookings-request-automatic-appointment-waitlist-management
- [S12] Wix Help, "Saving and Charging Clients' Credit Cards". https://support.wix.com/en/article/wix-bookings-saving-and-charging-clients-credit-cards ; "Multi-Service Appointments". https://support.wix.com/en/article/wix-bookings-scheduling-and-managing-multi-service-appointments
- [S13] Wix Help, "Sending SMS Reminders to Clients in Wix Bookings". https://support.wix.com/en/article/sending-sms-reminders-to-clients-in-wix-bookings
- [S13b] Wix Help, "Wix Messaging: Your Messaging Quota" (tier allowances; names unclear). https://support.wix.com/en/article/wix-sms-your-sms-quota
- [S14] Wix Help, "Upgrading Wix Bookings to a Business Premium Plan". https://support.wix.com/en/article/upgrading-wix-bookings
- [S15] Wix Help, "Wix AI Site Chat: An Overview". https://support.wix.com/en/article/about-the-wix-ai-chat-assistant
- [S16] Wix Help, "Front Desk Agent: An Overview". https://support.wix.com/en/article/ai-tools-about-the-ai-front-desk-agent
- [S17] Wix Help, "AI Phone Agent: An Overview". https://support.wix.com/en/article/ai-phone-agent-an-overview
- [S18] Wix press release, "Wix Launches Integration With Google Search, Google Maps and Google AI Mode", 2026. https://www.wix.com/press-room/home/post/wix-launches-integration-with-google-search-google-maps-and-google-ai-mode-to-turn-queries-into-ins
- [S18b] Wix Help, "Showing Your Services on Reserve with Google". https://support.wix.com/en/article/wix-bookings-showing-your-services-on-reserve-with-google
- [S19] Wix Help, "Wix Automations: An Overview". https://support.wix.com/en/article/wix-automations-about-the-new-automations-builder
- [S19b] Wix Help, "Email Marketing: Understanding Your Monthly Balance". https://support.wix.com/en/article/email-marketing-understanding-your-monthly-balance
- [S21b] Wix Help, "Request: Moving Members from One Site to Another". https://support.wix.com/en/article/request-moving-members-from-one-site-to-another-in-your-wix-account
- [S35] Wix Help, "About Wix Payments". https://support.wix.com/en/article/about-wix-payments
- [S35b] Wix Help, "Connecting Mollie as a Payment Provider". https://support.wix.com/en/article/connecting-mollie-as-a-payment-provider

**Wix: third-party and reviews**
- [S2] WebsiteBuilderExpert, "Wix Pricing 2026". https://www.websitebuilderexpert.com/website-builders/wix-pricing/ ; Playcode, "Wix Website Cost in 2026". https://playcode.io/blog/wix-website-cost
- [S2b] Vendbuddy, "Wix Review for Small Business (2026)". https://vendbuddy.io/blog/wix-review-for-small-business
- [S20] Trustpilot, wix.com reviews (2026 pages). https://www.trustpilot.com/review/www.wix.com
- [S20b] StartupOwl, Wix review (updated Jul 2026). https://startupowl.com/reviews/wix
- [S21] WiserReview, "Wix review: I tested it for 6 months" (2026). https://wiserreview.com/blog/wix-reviews/
- [S22] Website Builder Insider, "Can I move my Wix site to another host". https://www.websitebuilderinsider.com/can-i-move-my-wix-site-to-another-host/ ; FatLab, "Wix to WordPress migration". https://fatlabwebsupport.com/blog/wordpress-development/wix-to-wordpress-migration/
- [S23] Flow Cre8tive, "Wix Harmony Review" (2026). https://www.flowcre8tive.com.au/post/is-wix-harmony-good-for-small-businesses-we-tested-it-to-find-out
- [S24] HostAdvice, "Wix Harmony Review (2026)". https://hostadvice.com/hosting-company/wix-com-reviews/wix-com-harmony-review/ ; Work-management.org, "Wix Harmony Review 2026". https://work-management.org/website/wix-harmony-review/
- [S25] Busigner, "Wix Harmony Review: Why I'm Sticking to Classic Editor (2026)". https://www.busigner.com/post/wix-harmony-review-limitations ; PickleWix, "Why does Wix run so slow? (Harmony)". https://www.picklewix.com/post/why-does-wix-run-so-slow-wix-harmony-editor ; UltimateWB (competitor). https://www.ultimatewb.com/blog/13524/
- [S26] Trafft, "Wix Bookings Reviews" (competitor; older). https://trafft.com/wix-bookings-reviews/
- [S27] HostAdvice, "Wix Bookings Review (2026)" (Jul 2026). https://hostadvice.com/hosting-company/wix-com-reviews/wix-com-bookings-review/
- [S27b] Wix App Market, Bookings reviews. https://www.wix.com/app-market/web-solution/bookings
- [S28] Tooltester, "Wix Bookings 2026". https://www.tooltester.com/en/blog/wix-bookings/ ; Capterra, Wix Bookings reviews. https://www.capterra.com/p/14148/Wix-Bookings/?page=2
- [S36] webhosting.today, "Google's field data ranks the platforms…", 12 Aug 2026. https://webhosting.today/2026/08/12/googles-field-data-ranks-the-platforms-behind-live-sites-by-speed-and-the-gap-is-more-than-twofold/
- [S37] GreenGeeks, comparison (May 2026 CrUX snapshot). https://greengeeks.com/blog/ai-website-builder-vs-hand-coding
- [S38] Wix Studio forum, "Bookings staff members as site collaborators… limiting them at 5 and 10?" https://forum.wixstudio.com/t/wix-bookings-staff-members-as-site-collaborators-limiting-them-at-5-and-10-sure/62904

**Competitors**
- [S29] TrimCheck, "Fresha Fees 2026". https://trimcheck.com/for-barbers/fresha-fees/ ; Pabau, "Fresha Pricing 2026". https://pabau.com/blog/fresha-pricing/
- [S30] Bizzly, "Fresha Pricing 2026: Is It Still Free?" https://www.bizzly.net/guides/fresha-pricing ; Heybooked (competitor). https://heybooked.com/blogs/fresha-pricing
- [S31] SchedulingKit, "Booksy Pricing (2026)". https://schedulingkit.com/pricing-guides/booksy-pricing ; GlossGenius (competitor). https://glossgenius.com/blog/booksy-price
- [S32] Pabau, "Vagaro Pricing 2026". https://pabau.com/blog/vagaro-pricing/ ; Koalendar (competitor). https://koalendar.com/blog/vagaro-pricing
- [S33] Trustpilot, Booksy reviews. https://www.trustpilot.com/review/booksy.com?page=4 ; Setora (competitor), "Booksy Boost Commission Explained". https://www.setora.co.uk/blog/booksy-boost-commission-explained
- [S34] SortTheClicks, "Fresha Reviews (2026)". https://sorttheclicks.com/fresha-reviews-reddit/ ; TimeTailor (competitor), "Fresha Reddit & Trustpilot Reviews". https://www.timetailor.com/timetailor-alternatives/fresha-reddit-reviews
- [S39] Style Factory, "Squarespace Pricing and Fees (2026)". https://www.stylefactoryproductions.com/squarespace-pricing
- [S40] Acuity Scheduling, plans page (official). https://acuityscheduling.com/signup.php
- [S41] Calendly, pricing (official). https://calendly.com/pricing
- [S43] Square, Appointments pricing (official; prices didn't render). https://squareup.com/us/en/appointments/pricing ; Capterra, Square Appointments pricing. https://capterra.com/p/170263/Square-Appointments/pricing/ ; Koalendar (competitor). https://koalendar.com/blog/square-appointments-pricing
- [S44] HostAdvice, "GoDaddy Airo Pricing (2026)". https://hostadvice.com/hosting-company/godaddy-reviews/airo-pricing/ ; WebsiteBuilderExpert, GoDaddy review. https://www.websitebuilderexpert.com/website-builders/godaddy-review/
- [S44b] GoDaddy, "Product Updates – Summer 2025". https://www.godaddy.com/resources/godaddy-product-updates
- [S45] Vendor pages: Thea (https://www.wix.com/app-market/thea-ai-receptionist), Zolie (https://getzolie.com/wix).

**Payments and infrastructure**
- [S46] Stripe, pricing (US). https://stripe.com/pricing
- [S47] Stripe, pricing (Ireland/EEA). https://stripe.com/ie/pricing
- [S48] Stripe, Connect pricing. https://stripe.com/connect/pricing
- [S49] Stripe Docs, "Using Express connected accounts" / "Cross-border payouts". https://docs.stripe.com/connect/express-accounts ; https://docs.stripe.com/connect/cross-border-payouts
- [S50] Mollie Docs, "Connect: Monetize payments". https://docs.mollie.com/docs/connect-monetize-payments ; Solvimon, "Stripe vs Mollie fees". https://www.solvimon.com/pricing-guides/payment-fees-stripe-mollie
- [S51] Cloudflare Docs, "Cloudflare for SaaS: Plans". https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/

---

## The question: what problem should BizConnect own?

**If BizConnect can't outbuild Wix feature for feature, which customer problem should it own so completely that one type of business would choose it over Wix?**

**The problem to own is getting from "a client messaged me" to "a confirmed appointment that pays me even if they don't show".** The owner should be able to do it from their phone, with no website to build, no commission on their own clients, and nothing to pay until it earns them money.

The business that would choose BizConnect is the **solo or small-team beauty or grooming professional in the US, UK or EU** whose clients arrive through Instagram, WhatsApp and Google. They need a link, not a website.

For them, Wix brings friction on every side:
- **It costs money before the first booking** [S14].
- **Setup is a project:** a site, then Bookings, payments, policies and automations.
- **Its no-show tools leave gaps** [S8, S9b, S10, S11b].
- **It has no AI that books for a European small business** [S17].

The specialists close some of those gaps but charge commission on clients the owner considers their own [S29, S31].

BizConnect wins that owner by making three things work with no setup:
- **the booking link,**
- **the deposit and cancellation policy that runs itself,**
- **the rebooking loop.**

It then earns the right to add an AI front desk that answers only from facts the owner approved.
