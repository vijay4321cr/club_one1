# 2BHK — Bar ‹Hauté› Kitchen — Nightclub Website

Dark, minimal, **mobile-first** marketing + **ticketing & table-booking** site for
**2BHK Diner & Key Club**, Pune (operated by Myrah Hospitality LLP). Reference vibe:
pacha.com. It is a **fully static export** that talks to a live backend (Rizztix) entirely
from the browser.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export → dist/ (contains index.html)
npm run lint
```

> `npm start` / `next start` do **not** work with a static export. To preview the build,
> serve the folder: `npx serve dist`.

## Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** App Router + TypeScript, `output: "export"` (static) |
| Styling | **Tailwind CSS v4** — tokens live in `@theme` inside `src/app/globals.css` (no config file) |
| Motion | **GSAP + ScrollTrigger**, **Lenis** smooth scroll, custom page-transition curtain |
| 3D | **three / @react-three/fiber / drei** — the Past Highlights image ring (`Ring3D`) |
| Payments | **Cashfree** JS SDK (primary) + **Razorpay** checkout (fallback), auto-detected per order |
| QR | **qr-code-styling** — brand-styled QR generated client-side from a `qrstring` |
| Fonts | Clash Display + General Sans (self-hosted `src/fonts/`), Instrument Serif (Google) |

## What it does

- **Home** — video hero with live next-event countdown, live upcoming-events grid, Past
  Highlights (3D poster ring), partners/offers/gallery/FAQ, Instagram follow.
- **Events** — live listing (`/event`) and detail (`/event/view?id=…`) with a full on-site
  ticket purchase (multi-category cart → confirmation → pay → confirm → QR).
- **Table booking** — interactive floor map (`/event/table?event=…`): pan / pinch-zoom, tap
  a zone → tap tables, party split, pay, get guest QRs. First-run coach-mark guide.
- **Account** (`/account`) — phone-OTP login; Ticket bookings, Table bookings, editable
  Profile; QR carousel per booking; deep-linkable via `?order=`.
- **Guest/SMS ticket links** — `/ticket/view?id=…&token=…` (login-free) and `/t/?REF`.

## Where things live

| Concern | File(s) |
|---|---|
| **All backend calls** | `src/lib/api.ts` (events, tickets, contact) · `src/lib/auth.ts` (OTP + token) · `src/lib/tableApi.ts` (table booking) · `src/lib/payment.ts` (shared checkout) |
| **Types** (API + domain shapes) | `src/types/index.ts` |
| **Local content** | `src/lib/data/content.ts` (club info, partners, offers, gallery, FAQs), `src/lib/data/events.ts` (past events) |
| **Design tokens** | `src/app/globals.css` `@theme` block |
| **Business facts** | `club` object in `src/lib/data/content.ts` |
| **Assets** | `public/` (logo, past-highlight posters, gallery, hero video), favicon at `src/app/icon.png` |

## Deploy

Build → upload the **contents of `dist/`** plus the root `.htaccess` to any Apache web root.
No Node runtime needed. Set `NEXT_PUBLIC_SITE_URL` to the live domain before building (for
correct OG/canonical URLs). See **`AGENTS.md`** for the full architecture and the hard
constraints, and **`CONTEXT.md`** for current status / placeholders / decisions.

## Docs in this repo

- **`AGENTS.md`** — complete architecture brief + component/prop/data-flow reference (read first).
- **`CONTEXT.md`** — live status, placeholders, and the decision log.
- **`2BHK-Frontend-URL-Map.md`** — the URL contract for backend-generated email/SMS links.
