/**
 * My Account list visibility rules.
 *
 * - Paid / confirmed bookings always show.
 * - A pending booking shows only during a short grace window: tickets for 3 min
 *   after the order was placed; tables until their backend hold actually expires
 *   (`holdexpiresat`).
 * - Everything else (expired, cancelled, hold-expired, stale pending) is hidden.
 *
 * `now` is passed in (rather than read here) so the caller controls the clock —
 * it keeps this pure and avoids `Date.now()` during React render.
 */
import type { RizztixTicketDetail, TableBooking } from "@/types";
import { CLUB_SLUG, CLUB_ID } from "@/lib/api";

const PAID = /paid|confirm|success|complete/i;
const TICKET_GRACE_MS = 3 * 60 * 1000;

/**
 * True when a booking belongs to THIS club. The Rizztix account is shared across
 * every club on the platform, so My Account must keep only our own bookings.
 * Matches on `slug` (both tickets and tables carry it); falls back to `clubid`,
 * and keeps an item that carries no club info at all rather than hiding it.
 */
export function belongsToClub(item: {
  slug?: string;
  clubSlug?: string;
  // clubid may be a plain id string (tickets) OR a populated club object (tables)
  clubid?: string | { _id?: string; slug?: string } | null;
  clubId?: string | { _id?: string; slug?: string } | null;
  club?: { _id?: string; slug?: string } | null;
}): boolean {
  const clubObj =
    (item.clubid && typeof item.clubid === "object" ? item.clubid : null) ??
    (item.clubId && typeof item.clubId === "object" ? item.clubId : null) ??
    item.club ??
    null;
  const slug = item.slug ?? item.clubSlug ?? clubObj?.slug;
  if (slug) return slug === CLUB_SLUG;
  const clubid =
    (typeof item.clubid === "string" ? item.clubid : undefined) ??
    (typeof item.clubId === "string" ? item.clubId : undefined) ??
    clubObj?._id;
  if (clubid) return clubid === CLUB_ID;
  return true;
}

/**
 * Ticket booking: any genuinely-paid ticket always shows — including past events
 * (the backend may relabel orderstatus once the event is over). A truly
 * pending/unpaid order only shows within the 3-min grace after ordering.
 */
export function isTicketBookingVisible(t: RizztixTicketDetail, now: number): boolean {
  if (PAID.test(t.orderstatus ?? "")) return true;
  if (/captured|paid|success/i.test(t.paymentstatus ?? "")) return true;
  if (t.qrstring || t.qrcode || t.qrcodeimage || t.passQrcodes?.length) return true; // has entry QR = paid
  const iso =
    t.orderstatustimestamp ?? t.paymentstatustimestamp ?? t.createdAt ?? t.createdat;
  if (!iso) return false; // unknown age → treat as stale, hide
  const placed = +new Date(iso);
  if (Number.isNaN(placed)) return false;
  return now - placed < TICKET_GRACE_MS;
}

/**
 * Table booking visibility. The backend flips an abandoned hold to HOLD_EXPIRED
 * once its hold lapses, so we key off `status` rather than parsing
 * `holdexpiresat` — that timestamp is cleared the moment a deposit is paid, which
 * was wrongly hiding freshly-paid PENDING_PAYMENT bookings whose QRs hadn't
 * minted yet. Rule:
 *   - CONFIRMED / PENDING_PAYMENT / any active (non-dead) status → show
 *   - HOLD_EXPIRED / EXPIRED / CANCELLED / RELEASED → hide
 */
export function isTableBookingVisible(b: TableBooking): boolean {
  const status = (b.status ?? "").toUpperCase();
  // dead / inactive states never show (HOLD_EXPIRED, EXPIRED, CANCELLED, RELEASED)
  if (status.includes("EXPIR") || status.includes("CANCEL") || status.includes("RELEAS")) {
    return false;
  }
  return true; // CONFIRMED, PENDING_PAYMENT, any active state
}
