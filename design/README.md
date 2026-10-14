# BookPage: design handoff

Reference designs for the MVP. Each `.dc.html` file is one screen: plain HTML with inline CSS, plus a `<script type="text/x-dc">` block at the bottom holding the sample data and interactions. Use them as the visual and behaviour reference; rebuild them as Astro components, do not ship them as-is.

## Screens
| File | Screen |
| --- | --- |
| Landing.dc.html / LandingMobile.dc.html | Marketing site (bookpage.app), desktop and mobile |
| BookingPage.dc.html / BookingMobile.dc.html | Customer booking page (name.bookpage.app). Prop `biz`: salon, barber, clinic, tutor |
| Journey.dc.html | Customer journey, step by step (reference only) |
| Login.dc.html | Sign in with Google, Microsoft, X (no passwords) |
| Onboarding.dc.html | Onboarding after sign-in: About, Services, Booking, Look, Publish |
| Overview.dc.html | Owner dashboard: Today, Bookings, Questions, My page, Design (Pro), Plan |
| MobileHome.dc.html / MobileHandoff.dc.html | Owner mobile: Today, Questions |

## Design tokens
- Style: softened neo-brutalism. 2px ink borders, hard offset shadows (e.g. `6px 6px 0 #0D0D10`), radius 6 to 10px.
- Colours: page `#EBEBE8`, surface `#FFFFFF`, ink `#0D0D10`, muted text `#5C5C66`. Accents, one per element: red `#C8553D`, orange `#E07A3F`, yellow `#E9B949`. Tints: `#FBF3DC`, `#FCE9DC`, `#FBE4DE`.
- Type: Geist (headlines 800 to 900, tight letter-spacing), Geist Mono (labels, uppercase, letter-spacing .08em). Striped "scan" headline word = Geist Mono 800 with a repeating stripe background clipped to text.
- Motion: tile wave (hero), swinging workflow string (how it works), floating artifacts with `data-speed` for GSAP parallax, film grain overlay below the hero. Respect `prefers-reduced-motion`.

## Docs
- Use case study and onboarding spec live in Claude Docs; export them to `/docs` as Markdown.
