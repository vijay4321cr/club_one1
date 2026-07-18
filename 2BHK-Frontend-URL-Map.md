# 2BHK Standalone Website — URL Map for Backend (email / SMS / share links)

**Important context first:** this is the **standalone single-club 2BHK website**, not the
multi-club consumer site at `https://www.rizztix.com/`. It is a static frontend talking to
the Rizztix API with the club slug hardcoded to `bhk-slug`. There is **no `/clubs/{slug}`
routing** on this site — the whole site *is* the club.

## Domain

- The final production domain is **not yet confirmed by the client**.
- Current placeholder used in build config: `https://2bhkdinerkeyclub.in`
- It is exposed to the frontend build as `NEXT_PUBLIC_SITE_URL` — **backend should treat the
  domain as configurable** and we will confirm the final value before go-live.
- In this document `{DOMAIN}` = that domain.

## URL mapping

| Purpose | New full example URL | New path pattern | Notes |
|---|---|---|---|
| Club home page | `{DOMAIN}/` | `/` | Single-club site — replaces `/clubs/bhk-slug`. |
| All events / box office listing | `{DOMAIN}/event` | `/event` | Lists every live + upcoming event for `bhk-slug`. |
| Book latest event for the club | `{DOMAIN}/event` | `/event` | No dedicated "/book" path. The listing is live data; the soonest event is first. If backend needs a single "book now" link, use the event page URL below with the event id. |
| Event / ticket booking page | `{DOMAIN}/event/view?id=6a57d94dcc1866309bdbf40b` | `/event/view?id={eventId}` | **Query param, not path param** (static hosting). Full ticket purchase (login → Cashfree → confirm) happens on this page. |
| Legacy event path | `{DOMAIN}/event/6a57d94dcc1866309bdbf40b` | `/event/{eventId}` | Still works **only via server rewrite** (.htaccess 302 → `/event/view?id=…`). Prefer the new pattern in all new emails/SMS. |
| View online tickets (logged-in) | `{DOMAIN}/account` | `/account` | Shows ALL of the user's tickets with QR codes (via `/order/userTickets` + `/order/viewTicketsWithTicketId`). Requires phone-OTP login. There is **no per-order public URL**. |
| View ticket as guest (`?token=` links) | — **not implemented** | — | The standalone site has no guest ticket view. `guestviewtoken` from the API is currently unused. See "Gaps" below. |
| View table booking ticket | — **removed** | — | Table booking is not offered on this site (feature disabled until the table APIs are integrated). Do not send table links pointing at this domain. |
| SMS short ticket link (DLT) | `{DOMAIN}/t/?65ZDNR0` | `/t/?{bookingRef}` (bare ref after `?`) | ✅ Implemented. Also accepts `/t/?ref={bookingRef}` and legacy path form `/t/{bookingRef}` (server rewrite). User verifies the booking phone via OTP if not signed in, then sees that booking's tickets + entry QRs. |
| Login | `{DOMAIN}/login` | `/login?next={urlencoded-path}` | `next` is optional; returns user to that page after OTP login. Example: `/login?next=%2Fevent%2Fview%3Fid%3D6a57...` |
| Contact | `{DOMAIN}/contact` | `/contact` | |
| Legal | `{DOMAIN}/legal/terms` | `/legal/terms`, `/legal/privacy`, `/legal/refunds` | |

## Direct answers

1. **Is the domain still exactly `https://www.rizztix.com/`?**
   No. For bookings made through THIS site, links should use the 2BHK standalone domain
   (`{DOMAIN}`, final value to be confirmed). Bookings made through rizztix.com are
   unaffected and keep rizztix.com URLs.

2. **Are routes case-sensitive?**
   Yes — assume case-sensitive (Linux/Apache static hosting). All our paths are lowercase;
   always generate lowercase URLs. Mongo ids in `?id=` keep their exact casing.

3. **Do guest ticket links still need `?token=`?**
   There is currently **no guest ticket view on this site at all** — token or otherwise.
   Ticket viewing requires OTP login (`/account`).

4. **If a path was removed/renamed, what is the replacement?**
   - `/clubs/{slug}` → `/`
   - `/clubs/{slug}/book` → `/event` (or `/event/view?id={eventId}` for a specific event)
   - `/event/{eventId}` → `/event/view?id={eventId}` (legacy form still 302-redirects)
   - `/clubs/{slug}/my-tickets/{orderId}` and `/my-tickets/{orderId}` → `/account` (login
     required; no per-order URL)
   - `/clubs/{slug}/my-tickets/table/{bookingId}` → removed (no table booking)
   - `/t/?{bookingRef}` → ✅ available (see table above; legacy `/t/{ref}` also rewritten)

## Gaps — decision needed from backend

1. **Guest (login-free) ticket view** (`?token={64-hex}`) — the `/t/` page currently
   requires OTP login with the booking phone (SMS recipient = booking phone, so this
   works for the DLT SMS case). If a truly login-free link is required, we need the API
   endpoint that resolves a booking by ref + guestviewtoken (not in the current handoff
   doc) and will add token support to the same `/t/` page.

Safe defaults for customer communications about bookings made on this site:
**event links → `/event/view?id={eventId}` · ticket links → `/t/?{bookingRef}` or `/account`.**

---
*Prepared from the deployed route structure of the 2BHK standalone frontend (static export,
Next.js). Club slug fixed: `bhk-slug`. Questions → frontend dev.*
