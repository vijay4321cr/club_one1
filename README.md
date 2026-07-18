# 2BHK — Bar ‹Hauté› Kitchen — Nightclub Website

Dark, minimal, mobile-first nightclub site (reference: pacha.com). Next.js App Router + TypeScript + Tailwind v4, GSAP + ScrollTrigger animations, Lenis smooth scrolling, Three.js (React Three Fiber) hero.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Frontend-only for now — where the backend plugs in

| Piece | File | Notes |
|---|---|---|
| All data fetching | `src/lib/api.ts` | Every function is async and mock-backed. Replace bodies with `fetch()` calls — shapes are defined in `src/types/index.ts`. Bookings currently persist to `localStorage`. |
| Auth | `src/lib/auth.ts` | Mock login (any email/password). Swap for real sessions/tokens. |
| Mock content | `src/lib/data/` | Events, artists, offers, partners, gallery, FAQs, club contact info. |
| Payments | `src/components/checkout/CheckoutFlow.tsx` | "Pay" is mocked — wire Razorpay/Stripe at the `createBooking` call. |
| Instagram gallery | `src/components/sections/GallerySection.tsx` | Mock grid. Decide with client: Instagram Graph API (backend) vs embed widget (frontend only). |
| QR tickets | Checkout success + account page | Placeholder pattern; real QR comes with the ticketing API. |

## Branding swap points

- **Brand**: 2BHK (Myrah Hospitality LLP, GSTIN 27ABKFM0665L1ZU). Logo at `public/logo.png`, favicon at `src/app/icon.png`. Still placeholder: email + street address in `src/lib/data/content.ts`, Instagram handle in `GallerySection.tsx`, Google Maps embed URL.
- **Colors**: `src/app/globals.css` `@theme` block — `--color-primary` red.
- **Fonts**: Clash Display + General Sans (self-hosted, `src/fonts/`), Instrument Serif (Google). Configured in `src/app/layout.tsx`.
- **Imagery**: `src/components/ui/Poster.tsx` renders placeholder artwork everywhere — replace with real photos/`next/image` when assets arrive.
- **Contact/address/socials**: `club` object in `src/lib/data/content.ts` (includes the real Google Maps embed URL to swap).

## Structure

- `src/app/` — routes: home, `events/[slug]`, `checkout`, `account`, `login`, `services`, `contact`, `legal/{refunds,terms,privacy}`
- `src/components/layout/` — sticky header, fullscreen GSAP menu, curtain page transitions, Lenis provider, footer
- `src/components/hero/` — hero with lazy-loaded 3D scene (skipped on reduced-motion / low-memory devices)
- `src/components/overlays/` — 21+ age gate, cookie banner, WhatsApp button
- `src/components/ui/` — Reveal (scroll animation), magnetic Button, Marquee, Poster, inputs
