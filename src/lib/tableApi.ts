"use client";

/**
 * Event-wise table booking API (Rizztix /club/table-booking/*).
 * Slug is fixed to bhk-slug. Verified against the real 2BHK HAR.
 */
import { API_BASE_URL, CLUB_SLUG } from "@/lib/api";
import { authFetch } from "@/lib/auth";
import type {
  TableSlotsResult,
  TableLayoutsResult,
  TableInitResult,
  TableBooking,
  TableGuestQr,
  RizztixTicketDetail,
} from "@/types";

interface Envelope<T> {
  message?: string;
  data?: T;
}

/** public GET (no auth) with envelope unwrap; null on failure.
 *  Uncached so live-polling the floor plan always gets current availability. */
async function publicGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Envelope<T>;
    return json.data ?? null;
  } catch {
    return null;
  }
}

/** API A — slots for a night (public). */
export function getTableSlots(params: {
  serviceDate: string;
  eventId?: string;
  viewkey?: string;
}): Promise<TableSlotsResult | null> {
  const q = new URLSearchParams({ serviceDate: params.serviceDate });
  if (params.eventId) q.set("eventId", params.eventId);
  if (params.viewkey) q.set("viewkey", params.viewkey);
  return publicGet<TableSlotsResult>(
    `/club/table-booking/public/${CLUB_SLUG}/slots?${q.toString()}`
  );
}

/** API B — floor plan + areas/tables + live availability (public). */
export function getTableLayouts(params: {
  serviceDate: string;
  slotKey: string;
  eventId?: string;
  viewkey?: string;
}): Promise<TableLayoutsResult | null> {
  const q = new URLSearchParams({ serviceDate: params.serviceDate, slotKey: params.slotKey });
  if (params.eventId) q.set("eventId", params.eventId);
  if (params.viewkey) {
    q.set("viewkey", params.viewkey);
    q.set("viewKey", params.viewkey); // backend accepts both casings
  }
  return publicGet<TableLayoutsResult>(
    `/club/table-booking/public/${CLUB_SLUG}/layouts?${q.toString()}`
  );
}

/** the money + selection fields the init endpoint expects (camel + snake, per HAR) */
export interface TableInitInput {
  layoutId: string;
  areaId: string; // first selected table's _id (compat)
  areaIds?: string[]; // all selected tables (multi-table)
  partySizes?: number[]; // party per table, same order as areaIds
  serviceDate: string;
  slotKey: string;
  partySize: number; // total
  malePax: number;
  femalePax: number;
  clubId?: string;
  eventId?: string;
  empref?: string; // optional staff/employee referral code
  minimumSpend: number;
  depositAmount: number;
  bookingFee: number;
  gst: number;
  cgst: number;
  sgst: number;
  baseprice: number;
  baseamount: number;
  payNowAmount: number;
}

/** API C — create hold + payment order. */
export function initTableBooking(input: TableInitInput): Promise<TableInitResult> {
  const payNow = input.payNowAmount.toFixed(2);
  // empref is optional — trimmed, uppercased, ≤32 chars, sent only when non-empty
  const empref = (input.empref ?? "").trim().toUpperCase().slice(0, 32);
  return authFetch<TableInitResult>("/club/table-booking/booking/init", {
    body: {
      layoutId: input.layoutId,
      areaId: input.areaId,
      ...(input.areaIds && input.areaIds.length > 1
        ? { areaIds: input.areaIds, partySizes: input.partySizes }
        : {}),
      serviceDate: input.serviceDate,
      slotKey: input.slotKey,
      partySize: input.partySize,
      malePax: input.malePax,
      femalePax: input.femalePax,
      slug: CLUB_SLUG,
      clubId: input.clubId,
      eventId: input.eventId,
      ...(empref ? { empref } : {}),
      // money — send both casings exactly like the reference frontend
      gst: input.gst,
      tax: input.gst,
      cgst: input.cgst,
      sgst: input.sgst,
      baseamount: input.baseamount,
      baseprice: input.baseprice,
      bookingFee: input.bookingFee,
      booking_fee: input.bookingFee,
      depositAmount: input.depositAmount,
      deposit_amount: input.depositAmount,
      payNowAmount: payNow,
      pay_now_amount: payNow,
      amount: payNow,
      amount_paise: Math.round(input.payNowAmount * 100),
      amountPaise: Math.round(input.payNowAmount * 100),
    },
  });
}

/** API D — confirm after gateway success. */
export function confirmTableBooking(input: {
  bookingId: string;
  eventId?: string;
  cashfree?: { order_id: string };
  razorpay?: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };
}): Promise<{ booking: TableBooking }> {
  return authFetch("/club/table-booking/booking/confirm", {
    body: {
      booking_id: input.bookingId,
      bookingId: input.bookingId,
      eventId: input.eventId,
      ...(input.cashfree ? { order_id: input.cashfree.order_id } : {}),
      ...(input.razorpay ?? {}),
    },
  });
}

/** ref that looks like a combined parent, e.g. "1KZXQWX (2 tables)" */
const isParentRef = (ref?: string) => !!ref && /\(\s*\d+\s*tables?\s*\)/i.test(ref);

/**
 * A multi-table booking comes back as one record per table (each its own
 * bookingref) that all share a single `orderid`. Collapse each order into one
 * entry so the account shows a single booking with every guest QR together.
 */
export function groupTableBookings(list: TableBooking[]): TableBooking[] {
  const byOrder = new Map<string, TableBooking[]>();
  const loose: TableBooking[] = [];
  for (const b of list) {
    if (b.orderid) byOrder.set(b.orderid, [...(byOrder.get(b.orderid) ?? []), b]);
    else loose.push(b);
  }

  const grouped: TableBooking[] = [];
  for (const members of byOrder.values()) {
    if (members.length === 1) {
      grouped.push(members[0]);
      continue;
    }
    // prefer the combined parent record ("… (N tables)"); else the first
    const parent = members.find((m) => isParentRef(m.bookingref)) ?? members[0];
    const children = members.filter((m) => m !== parent);
    const tables = children.length || members.length;

    // gather every guest QR across the group, de-duped by guest ref
    const seen = new Set<string>();
    const qrs: TableGuestQr[] = [];
    for (const m of members)
      for (const q of m.guestQrcodes ?? []) {
        const key = q.guestRef || `${m._id}:${q.guestIndex}`;
        if (seen.has(key)) continue;
        seen.add(key);
        qrs.push(q);
      }

    const labels = members
      .map((m) => m.table?.tableLabel ?? m.areaLabel)
      .filter((x): x is string => !!x);

    grouped.push({
      ...parent,
      bookingref: isParentRef(parent.bookingref)
        ? parent.bookingref
        : `${parent.bookingref} (${tables} tables)`,
      tableCount: tables,
      partySize: children.length
        ? children.reduce((s, m) => s + (m.partySize || 0), 0)
        : members.reduce((s, m) => s + (m.partySize || 0), 0),
      areaLabel: labels.length ? Array.from(new Set(labels)).join(" · ") : parent.areaLabel,
      guestQrcodes: qrs.length ? qrs : parent.guestQrcodes,
    });
  }
  return [...grouped, ...loose];
}

/** API E — my table bookings (multi-table orders collapsed to one entry). */
export async function getMyTableBookings(): Promise<TableBooking[]> {
  const data = await authFetch<{ bookings?: TableBooking[] }>("/club/table-booking/booking/mine");
  return groupTableBookings(data?.bookings ?? []);
}

/* ---- combined "my bookings": one call returns tickets + tables ---- */

type Raw = Record<string, unknown>;
const has = (o: Raw, k: string) => o[k] !== undefined && o[k] !== null;
// table records carry seating/layout fields; ticket records carry ticket fields
const looksTable = (o: Raw) =>
  has(o, "layoutId") ||
  has(o, "areaId") ||
  has(o, "areaIds") ||
  has(o, "tableCount") ||
  has(o, "guestQrcodes") ||
  has(o, "slotKey") ||
  has(o, "depositAmount");
const looksTicket = (o: Raw) =>
  has(o, "tickettype") ||
  has(o, "passQrcodes") ||
  has(o, "ticketlines") ||
  has(o, "tickettypeid") ||
  has(o, "noofticket") ||
  has(o, "eventDetails");

export interface MyBookings {
  ticketBookings: RizztixTicketDetail[];
  tableBookings: TableBooking[];
}

/**
 * Single-call "everything I've booked" from `/club/table-booking/booking/mine`.
 * Handles both an already-split response ({ticketBookings,tableBookings}) and a
 * mixed list, classifying each item by its fields. Unknown items default to
 * "table" so the current table-only behaviour is preserved on older backends.
 */
export async function getMyBookings(): Promise<MyBookings> {
  const data = await authFetch<unknown>("/club/table-booking/booking/mine");
  const obj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;

  // backend already splits them
  if (Array.isArray(obj.ticketBookings) || Array.isArray(obj.tableBookings)) {
    return {
      ticketBookings: (obj.ticketBookings ?? []) as RizztixTicketDetail[],
      tableBookings: groupTableBookings((obj.tableBookings ?? []) as TableBooking[]),
    };
  }

  const list: Raw[] = Array.isArray(data)
    ? (data as Raw[])
    : ((obj.bookings ?? obj.data ?? []) as Raw[]);

  const ticketRaw: Raw[] = [];
  const tableRaw: Raw[] = [];
  for (const b of list) {
    if (looksTable(b)) tableRaw.push(b);
    else if (looksTicket(b)) ticketRaw.push(b);
    else tableRaw.push(b); // preserve legacy table-only behaviour
  }

  return {
    ticketBookings: ticketRaw as unknown as RizztixTicketDetail[],
    tableBookings: groupTableBookings(tableRaw as unknown as TableBooking[]),
  };
}

/** does a ticket detail actually carry a scannable QR? (else we need the detail call) */
export function ticketHasQr(t: RizztixTicketDetail): boolean {
  return !!(
    t.qrstring ||
    t.qrcode ||
    t.qrcodeimage ||
    t.qrcodeimages?.length ||
    t.passQrcodes?.length
  );
}

/** API F — one booking by id. */
export function getTableBooking(bookingId: string): Promise<{ booking: TableBooking }> {
  return authFetch(`/club/table-booking/booking/${bookingId}`);
}
