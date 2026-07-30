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
  clubid?: string;
  clubId?: string;
}): boolean {
  const slug = item.slug ?? item.clubSlug;
  if (slug) return slug === CLUB_SLUG;
  const clubid = item.clubid ?? item.clubId;
  if (clubid) return clubid === CLUB_ID;
  return true;
}

/** Ticket booking: paid → always; pending → only within 3 min of the order. */
export function isTicketBookingVisible(t: RizztixTicketDetail, now: number): boolean {
  if (PAID.test(t.orderstatus ?? "")) return true;
  const iso =
    t.orderstatustimestamp ?? t.paymentstatustimestamp ?? t.createdAt ?? t.createdat;
  if (!iso) return false; // unknown age → treat as stale, hide
  const placed = +new Date(iso);
  if (Number.isNaN(placed)) return false;
  return now - placed < TICKET_GRACE_MS;
}

/** Table booking: confirmed → always; pending → only while the hold is unexpired. */
export function isTableBookingVisible(b: TableBooking, now: number): boolean {
  const status = (b.status ?? "").toUpperCase();
  if (status === "CONFIRMED" || PAID.test(status)) return true;
  if (status.includes("PENDING")) {
    if (!b.holdexpiresat) return false;
    const exp = +new Date(b.holdexpiresat);
    return !Number.isNaN(exp) && exp > now;
  }
  return false; // EXPIRED, CANCELLED, HOLD_EXPIRED, …
}
