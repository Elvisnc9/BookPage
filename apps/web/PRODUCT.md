# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Owners** of small local businesses in Europe and the USA (salons, barbers, spas, clinics, tutors, trainers, photographers, cleaners, mechanics, venues, restaurants). They set up their page once, usually on a phone or a laptop between appointments, and come back to edit services and hours.
- **Customers** of those businesses, who land on `{slug}.bookpage.app` from a bio link, WhatsApp or Google, and book in about 30 seconds without an account.

## Product Purpose

A free booking page for every local business: "Never miss a booking." The owner answers a few questions, picks a website template, and gets a live page where customers see services, prices, hours and free times, and book.

## Positioning

One business profile is the single source of truth: the booking page, the availability engine and (later) the AI receptionist all read from it. A template changes how the page looks, never what it says.

## Operating Context

- Onboarding: five steps (Template, About, Services, Booking, Review & publish), autosaved to the server as the owner types; the owner can leave and resume.
- Booking pages are server-rendered with no JavaScript; they must be fast on old phones.
- Per-business time zone and currency; GDPR applies (no third-party embeds on booking pages).

## Capabilities and Constraints

- Owner app: Astro + Preact islands. Booking pages: Astro server rendering, Preact components rendered to static HTML.
- API: NestJS + Prisma + Postgres (Neon). Uploaded images are stored in Postgres for now (no object storage configured).
- Pricing page says Pro ($15/month) adds templates, branding, video and a gallery. Billing does not exist yet; whether templates are gated is undecided.

## Brand Commitments

- BookPage's own surfaces (marketing, owner app): softened neubrutalism. Warm cream grounds, strong black type, 2px ink borders, restrained orange, controlled hard offset shadows. Geist and Geist Mono.
- Customer-facing templates belong to the business, not to BookPage: each may carry its own type and palette.

## Evidence on Hand

- Demo business "Glow Studio" (seed). No real customer photos, reviews, ratings or social links exist in the data; never fabricate them on a booking page.
- Design references: `design-refs/` (landing, booking page, onboarding).

## Product Principles

1. The owner's data is never lost: switching templates, leaving a step or losing the connection keeps every field.
2. What the preview shows is what gets published.
3. Honest pages: only facts the owner entered, plus true platform facts.
4. Fast and calm on a phone: no JavaScript on booking pages, short purposeful motion in the owner app.

## Accessibility & Inclusion

WCAG 2.1 AA: labelled controls, visible focus, keyboard reachable, announced save states, reduced motion respected, 16px inputs on touch.
