"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import TransitionLink from "@/components/ui/TransitionLink";
import FloorMap from "@/components/table/FloorMap";
import BrandLoader from "@/components/layout/BrandLoader";
import TermsDisclosure from "@/components/events/TermsDisclosure";
import QrSlider from "@/components/account/QrSlider";
import { useAuth } from "@/lib/useAuth";
import { ApiError } from "@/lib/auth";
import { openCheckout } from "@/lib/payment";
import {
  getTableSlots,
  getTableLayouts,
  initTableBooking,
  confirmTableBooking,
  getMyTableBookings,
} from "@/lib/tableApi";
import { useUpcomingEvents } from "@/lib/useUpcoming";
import { inr, inrExact } from "@/lib/format";
import type { TableLayout, TableZone, TableSpot, TableGuestQr } from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** signature of a layout's availability-driving fields — skip re-renders when
 *  a poll returns identical data (keeps the map smooth) */
const layoutSig = (l: TableLayout) =>
  JSON.stringify(
    l.areas.map((a) => [
      a._id,
      a.pinColor,
      a.selectable,
      (a.tables ?? []).map((t) => [t._id, t.pinColor, t.selectable, t.tablesLeft]),
    ])
  );
// local calendar date (YYYY-MM-DD). NOT toISOString() — that returns the UTC
// date, which shifts a day for IST users near midnight (today 31 showed as 30
// and the picker wouldn't let you select the 31st).
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Phase = "map" | "details" | "paying" | "confirming" | "done";

export default function TableBooking() {
  const params = useSearchParams();
  const router = useRouter();
  const eventId = params.get("event") ?? "";
  const { session } = useAuth();
  const eventsData = useUpcomingEvents();
  const event = eventsData?.events.find((e) => e._id === eventId);

  // service night: default to the soonest valid night (today, else event start)
  const [serviceDate, setServiceDate] = useState("");
  const [slotKey, setSlotKey] = useState("");
  const [viewkey, setViewkey] = useState<string | undefined>();
  const [layout, setLayout] = useState<TableLayout | null>(null);
  const layoutSigRef = useRef(""); // last-seen availability signature (poll de-dupe)
  const [depositPercent, setDepositPercent] = useState(50);
  const [clubId, setClubId] = useState<string | undefined>();
  const [loadingMap, setLoadingMap] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false); // scene image decoded
  const [guideActive, setGuideActive] = useState(false); // interactive tour running

  // one or more tables, each with its own party size
  const [selected, setSelected] = useState<
    { zone: TableZone; table: TableSpot; pax: number }[]
  >([]);
  const [showModal, setShowModal] = useState(false);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const [phase, setPhase] = useState<Phase>("map");
  const [men, setMen] = useState(0); // women = total − men
  const [empref, setEmpref] = useState(""); // optional staff referral code
  const [error, setError] = useState("");
  const [guestQrs, setGuestQrs] = useState<TableGuestQr[] | null>(null);
  // true while entry QRs are still minting — we hold a spinner until ALL are
  // ready, then reveal them at once (no popping-in as each one lands)
  const [qrsLoading, setQrsLoading] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [orderId, setOrderId] = useState("");
  // payment session from the FIRST init — the backend omits it when it returns
  // an already-held booking on retry, so we reuse this to reopen the gateway
  const paySession = useRef<{
    orderid: string;
    payment_session_id?: string | null;
    razorpayKeyId?: string;
    cashfreeEnv?: string;
    currency?: string;
    payNowAmount: number;
  } | null>(null);

  // lock page scroll while the booking sheet is open
  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  // preload + decode the floor image so we hold the branded loader (no black flash)
  useEffect(() => {
    setMapReady(false);
    const url = layout?.sceneimageurl;
    if (!url) return;
    let cancelled = false;
    const img = new window.Image();
    const done = () => !cancelled && setMapReady(true);
    img.onload = done;
    img.onerror = done; // never hang the page on a bad image
    img.src = url;
    if (img.complete) done();
    return () => {
      cancelled = true;
    };
  }, [layout?.sceneimageurl]);

  // pick the default service date once events resolve
  useEffect(() => {
    if (serviceDate || !event) return;
    const today = new Date();
    const start = new Date(event.startdatetime);
    const end = new Date(event.enddatetime);
    const def = today >= start && today <= end ? today : start;
    setServiceDate(iso(def));
  }, [event, serviceDate]);

  // load slots → layout whenever the service date changes
  useEffect(() => {
    if (!serviceDate || !eventId) return;
    let cancelled = false;
    setLoadingMap(true);
    setMapError("");
    setSelected([]);
    (async () => {
      const slots = await getTableSlots({ serviceDate, eventId });
      const key =
        slots?.defaultSlotKey ?? slots?.slots?.[0]?.key ?? event?.tableBookingSlotKey ?? "";
      const viewkey = slots?.availableViewkeys?.[0] ?? event?.tableBookingViewkey;
      if (!key) {
        if (!cancelled) {
          setMapError("No seating is open for this night.");
          setLoadingMap(false);
        }
        return;
      }
      const lay = await getTableLayouts({ serviceDate, slotKey: key, eventId, viewkey });
      if (cancelled) return;
      const first = lay?.layouts?.[0] ?? null;
      setSlotKey(key);
      setViewkey(viewkey);
      setLayout(first);
      layoutSigRef.current = first ? layoutSig(first) : "";
      setDepositPercent(lay?.depositPercent ?? 50);
      setClubId(lay?.clubId);
      if (!first) setMapError("Floor plan unavailable for this night.");
      setLoadingMap(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceDate, eventId, event]);

  // live-refresh the floor plan so table/zone colours reflect availability in
  // real time (green → red/yellow) while the guest is choosing — no refresh.
  // paused during checkout (sheet open / paying / done) so nothing yanks mid-flow.
  useEffect(() => {
    if (!serviceDate || !slotKey || !eventId) return;
    if (guideActive || showModal || phase === "paying" || phase === "confirming" || phase === "done")
      return;
    let cancelled = false;
    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      const lay = await getTableLayouts({ serviceDate, slotKey, eventId, viewkey });
      const fresh = lay?.layouts?.[0];
      if (cancelled || !fresh) return;
      const sig = layoutSig(fresh);
      if (sig === layoutSigRef.current) return; // unchanged → skip re-render
      layoutSigRef.current = sig;
      setLayout(fresh);
      // refresh kept tables from fresh data; drop any that just became unavailable
      setSelected((prev) =>
        prev.flatMap((x) => {
          const z = fresh.areas.find((a) => a._id === x.zone._id);
          const t = z?.tables?.find((tt) => tt._id === x.table._id);
          if (!z || !t || t.pinColor !== "green" || t.selectable === false) return [];
          return [{ ...x, zone: z, table: t }];
        })
      );
    };
    const id = window.setInterval(poll, 5_000);
    const onVis = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [serviceDate, slotKey, eventId, viewkey, showModal, phase, guideActive]);

  const partySize = selected.reduce((s, x) => s + x.pax, 0);
  const menCount = Math.min(men, partySize);
  const women = partySize - menCount;
  const selectedIds = selected.map((x) => x.table._id);
  // every table within its own min/max, and at least one guest
  const allWithinRange =
    selected.length > 0 &&
    partySize > 0 &&
    selected.every((x) => x.pax >= x.table.minPartySize && x.pax <= x.table.maxPartySize);

  const toggleTable = (zone: TableZone, table: TableSpot) => {
    setSelected((prev) => {
      // deselect if already picked
      if (prev.some((x) => x.table._id === table._id)) {
        return prev.filter((x) => x.table._id !== table._id);
      }
      // multi-table booking is limited to a single zone — block other zones
      if (prev.length && prev[0].zone._id !== zone._id) return prev;
      return [...prev, { zone, table, pax: Math.max(1, table.minPartySize) }];
    });
  };
  const setPax = (id: string, pax: number) =>
    setSelected((prev) => prev.map((x) => (x.table._id === id ? { ...x, pax: Math.max(1, pax) } : x)));

  // quote (matches the real 2BHK HAR; multi-table sums each table's min spend)
  const quote = useMemo(() => {
    if (selected.length === 0) return null;
    const minimumSpend = round2(
      selected.reduce((s, x) => s + x.table.priceFromPerPerson * x.pax, 0)
    );
    const depositAmount = round2((minimumSpend * depositPercent) / 100);
    const bookingPct = event?.bookingpercentage ?? 5;
    const bookingFee = round2((minimumSpend * bookingPct) / 100);
    const gst = round2(bookingFee * 0.18);
    const cgst = round2(bookingFee * 0.09);
    const baseamount = round2(bookingFee + gst);
    const payNowAmount = round2(depositAmount + baseamount);
    return { minimumSpend, depositAmount, bookingFee, gst, cgst, baseamount, payNowAmount };
  }, [selected, depositPercent, event]);

  const dateBounds = useMemo(() => {
    if (!event) return { min: "", max: "" };
    const today = iso(new Date());
    const start = iso(new Date(event.startdatetime));
    const end = iso(new Date(event.enddatetime));
    return { min: start > today ? start : today, max: end };
  }, [event]);

  /* ---------- pay ---------- */
  const pay = async () => {
    if (!layout || selected.length === 0 || !quote) return;
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(`/event/table?event=${eventId}`)}`);
      return;
    }
    if (!allWithinRange) {
      setError("Set a valid party size for each table.");
      return;
    }
    setError("");
    setPhase("paying");
    try {
      const init = await initTableBooking({
        layoutId: layout._id,
        areaId: selected[0].table._id,
        areaIds: selected.map((x) => x.table._id),
        partySizes: selected.map((x) => x.pax),
        serviceDate,
        slotKey,
        partySize,
        malePax: menCount,
        femalePax: women,
        clubId,
        eventId,
        empref,
        minimumSpend: quote.minimumSpend,
        depositAmount: quote.depositAmount,
        bookingFee: quote.bookingFee,
        gst: quote.gst,
        cgst: quote.cgst,
        sgst: quote.cgst,
        baseprice: quote.bookingFee,
        baseamount: quote.baseamount,
        payNowAmount: quote.payNowAmount,
      });

      // payment fields nest inside `booking` (real HAR), unlike ticket /order/buy
      const b = init.booking;
      setOrderId(b.orderid);

      // The backend returns a payment session only when it CREATES a hold. On a
      // retry of an already-held booking it responds { alreadyBooked, booking }
      // with NO session — so cache the session from the first attempt and reuse
      // it for the same order, otherwise the gateway can't reopen and the user
      // is stuck on "No payment method available".
      const hasSession = !!(b.payment_session_id || b.razorpayKeyId);
      if (hasSession) {
        paySession.current = {
          orderid: b.orderid,
          payment_session_id: b.payment_session_id,
          razorpayKeyId: b.razorpayKeyId,
          cashfreeEnv: b.cashfreeEnv,
          currency: b.currency,
          payNowAmount: b.payNowAmount ?? quote.payNowAmount,
        };
      }
      const pf =
        hasSession || paySession.current?.orderid === b.orderid ? paySession.current : null;

      if (!pf) {
        setError(
          `This table is already held for you (ref ${b.bookingref}). Give it a moment and tap Book now again, or finish payment from My Account.`
        );
        setPhase("details");
        return;
      }

      const result = await openCheckout(
        {
          orderid: pf.orderid,
          amount: pf.payNowAmount ?? quote.payNowAmount,
          currency: pf.currency,
          payment_session_id: pf.payment_session_id,
          cashfreeEnv: pf.cashfreeEnv,
          razorpayKeyId: pf.razorpayKeyId,
        },
        {
          name: session.user.fullname,
          email: session.user.email,
          contact: session.user.phone,
          description: `${event?.title ?? "2BHK"} · ${selected.length} table${
            selected.length > 1 ? "s" : ""
          } · ${partySize} pax`,
        }
      );

      if (result.status === "dismissed") {
        setPhase("details");
        return;
      }
      if (result.status === "error" || result.status === "no_provider") {
        setError(result.status === "error" ? result.message : "No payment method available.");
        setPhase("details");
        return;
      }

      // payment done — close the sheet and show the confirming screen
      setShowModal(false);
      setPhase("confirming");

      const { booking } = await confirmTableBooking({
        bookingId: init.booking._id,
        eventId,
        cashfree: result.status === "cashfree" ? { order_id: result.order_id } : undefined,
        razorpay: result.status === "razorpay" ? result : undefined,
      });
      setBookingRef(booking.bookingref ?? init.booking.bookingref);
      // seed with any ready QRs from the confirm response, but keep the spinner
      // up — the poll below waits until every guest QR has minted, then reveals
      setGuestQrs((booking.guestQrcodes ?? []).filter((q) => q.qrcodeimage || q.qrstring));
      setQrsLoading(true);
      setPhase("done");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/event/table?event=${eventId}`)}`);
        return;
      }
      setError(
        e instanceof ApiError ? e.message : "Could not complete the booking — please try again."
      );
      // reopen the sheet so the error is visible and retryable
      setPhase("details");
      setShowModal(true);
    }
  };

  // on success, keep fetching until EVERY guest QR is minted (they generate
  // async), then reveal them all at once — no partial slider that grows as each
  // one lands. Holds the spinner until complete or the poll gives up.
  useEffect(() => {
    if (phase !== "done") return;
    if (!orderId) {
      setQrsLoading(false); // no order to poll → just show whatever confirm gave
      return;
    }
    let cancelled = false;
    setQrsLoading(true);
    (async () => {
      let best: TableGuestQr[] = [];
      for (let attempt = 0; attempt < 8 && !cancelled; attempt++) {
        try {
          const mine = await getMyTableBookings();
          const match = mine.find((b) => b.orderid === orderId);
          // only count QRs that actually carry a scannable code (not placeholders)
          const ready = (match?.guestQrcodes ?? []).filter((q) => q.qrcodeimage || q.qrstring);
          if (ready.length > best.length) best = ready;
          const expected = match?.partySize ?? partySize;
          if (best.length > 0 && best.length >= expected) break; // all minted
        } catch {
          /* ignore and retry */
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) {
        if (best.length) setGuestQrs(best);
        setQrsLoading(false); // reveal (all, or whatever we have after giving up)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, orderId, partySize]);

  /* ---------- no event ---------- */
  if (eventsData && !event) {
    return (
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
        <p className="label mb-3">Table booking</p>
        <h1 className="h-display !normal-case text-4xl md:text-5xl">
          Pick an event first<span className="text-primary">.</span>
        </h1>
        <Button href="/event" className="mt-8">
          Browse events
        </Button>
      </div>
    );
  }

  /* ---------- confirming payment ---------- */
  if (phase === "confirming") {
    return (
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-28 text-center md:pt-36">
        <p className="label mb-3 flex items-center justify-center gap-2 !text-primary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Payment received
        </p>
        <h1 className="h-display !normal-case text-4xl md:text-5xl">Confirming your table…</h1>
        <p className="mt-3 text-sm text-muted">
          Hold on a second — locking in your table. Don&apos;t close this page.
        </p>
      </div>
    );
  }

  /* ---------- success ---------- */
  if (phase === "done") {
    const qrs = guestQrs ?? [];
    return (
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-28 text-center md:pt-36">
        <p className="label mb-3 !text-primary">Table confirmed</p>
        <h1 className="h-display !normal-case text-4xl md:text-5xl">Your table&apos;s locked in.</h1>
        <p className="mt-3 text-sm text-muted">
          {event?.title} · {partySize} guests · Ref{" "}
          <span className="text-cream">{bookingRef}</span>
        </p>
        <div className="mx-auto mt-8 max-w-sm">
          {qrsLoading ? (
            <div className="rounded-lg border border-line p-8">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
              <p className="label !text-[0.5625rem] !text-muted">
                Minting your entry QR{partySize > 1 ? "s" : ""}…
              </p>
            </div>
          ) : qrs.length > 0 ? (
            <QrSlider
              slides={qrs.map((q) => ({
                qrstring: q.qrstring,
                qrcodeimage: q.qrcodeimage,
                code: q.guestRef || `Guest ${q.guestIndex}`,
              }))}
              codeLabel="Guest code"
              unit="Guest"
              footnote={`${qrs.length} guest QR${qrs.length > 1 ? "s" : ""} · also in My Account`}
            />
          ) : (
            <p className="label !text-[0.5625rem] !text-muted">
              Your entry QRs will appear in My Account shortly.
            </p>
          )}
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="/account">My bookings</Button>
          <Button href="/event" variant="outline">
            More events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
      <Reveal>
        <p className="label mb-3">
          <TransitionLink
            href={`/event/view?id=${eventId}`}
            className="transition-colors hover:text-primary"
          >
            ← Back to event
          </TransitionLink>
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="h-display !normal-case text-3xl sm:text-4xl md:text-5xl">Book a Table</h1>
            {event && <p className="mt-2 text-sm text-muted">{event.title}</p>}
          </div>
          {/* service night picker */}
          <label className="text-sm">
            <span className="label mb-1 block">Night</span>
            <input
              type="date"
              value={serviceDate}
              min={dateBounds.min}
              max={dateBounds.max}
              onChange={(e) => setServiceDate(e.target.value)}
              className="border-b border-line bg-transparent py-2 text-cream focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      </Reveal>

      {mapError ? (
        <div className="mt-8 rounded-sm border border-line p-10 text-center">
          <p className="h-display text-2xl">{mapError}</p>
          <p className="mt-3 text-sm text-muted">Try another night.</p>
        </div>
      ) : loadingMap || !layout || !mapReady ? (
        // hold the blinking 2BHK mark until the plan image is fully decoded
        <div className="mt-8 -mx-5 flex h-[74svh] items-center justify-center bg-coal sm:mx-0 sm:h-auto sm:aspect-[16/10] sm:rounded-md">
          <BrandLoader label="Loading floor plan…" />
        </div>
      ) : (
        // full-bleed + tall on mobile; boxed on desktop
        <div className="mt-8 -mx-5 sm:mx-0">
          <FloorMap
            layout={layout}
            selectedIds={selectedIds}
            onToggle={toggleTable}
            onGuideActive={setGuideActive}
          />
        </div>
      )}

      {/* slim Book Now bar — rises from the bottom once tables are picked */}
      {selected.length > 0 && !showModal && (
        <div className="sticky bottom-4 z-30 mt-6">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-full border border-line bg-elevated/95 py-3 pl-6 pr-3 shadow-lg shadow-black/40 backdrop-blur-md">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-medium uppercase">
                {selected.length} table{selected.length > 1 ? "s" : ""} ·{" "}
                {selected.map((x) => x.table.label).join(", ")}
              </p>
              <p className="truncate text-xs text-muted">
                {inr(quote?.minimumSpend ?? 0)} min spend · tap more tables in this zone to add
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="shrink-0 rounded-full bg-primary px-6 py-3 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal"
            >
              Book Now
            </button>
          </div>
        </div>
      )}

      {/* booking details bottom-sheet */}
      {selected.length > 0 && quote && showModal && (
        <div
          className="fixed inset-0 z-70 flex items-end justify-center bg-coal/80 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Booking details"
          onClick={() => phase !== "paying" && setShowModal(false)}
        >
          <div
            data-lenis-prevent
            className="tb-sheet max-h-[92svh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-surface p-6 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="label mb-1">
                  Your table{selected.length > 1 ? "s" : ""} · {selected.length}
                </p>
                <p className="font-display text-xl font-semibold uppercase leading-tight">
                  Party of {partySize}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elevated transition-colors hover:bg-line"
              >
                ✕
              </button>
            </div>

            {/* per-table party size */}
            <div className="space-y-3">
              {selected.map(({ zone, table, pax }) => (
                <div
                  key={table._id}
                  className="flex items-center justify-between gap-3 rounded-md border border-line p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-medium uppercase">
                      {zone.label} · {table.label}
                    </p>
                    <p className="text-xs text-muted">
                      {inr(table.priceFromPerPerson)}/pax · seats {table.minPartySize}–
                      {table.maxPartySize}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <button
                      onClick={() => setPax(table._id, pax - 1)}
                      disabled={pax <= table.minPartySize}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line transition-colors enabled:hover:border-cream disabled:opacity-40"
                      aria-label="Fewer guests"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-display text-lg tabular-nums">{pax}</span>
                    <button
                      onClick={() => setPax(table._id, pax + 1)}
                      disabled={pax >= table.maxPartySize}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line transition-colors enabled:hover:border-cream disabled:opacity-40"
                      aria-label="More guests"
                    >
                      +
                    </button>
                    <button
                      onClick={() => toggleTable(zone, table)}
                      aria-label="Remove table"
                      className="label ml-1 !text-muted transition-colors hover:!text-primary"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* gender split — men & women each get their own −/+ (they always
                total the party size, so raising one lowers the other) */}
            <div className="mt-4 rounded-md border border-line p-3">
              <p className="label mb-3 !text-[0.5625rem]">
                Party split · <span className="font-bold !text-cream">{partySize}</span> guests
              </p>

              <div className="space-y-3">
                {(
                  [
                    ["Men", menCount, () => setMen(menCount - 1), () => setMen(menCount + 1)],
                    ["Women", women, () => setMen(menCount + 1), () => setMen(menCount - 1)],
                  ] as [string, number, () => void, () => void][]
                ).map(([label, value, dec, inc]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="label !text-[0.5625rem] !text-cream">{label}</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={dec}
                        disabled={value <= 0}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-line transition-colors enabled:hover:border-cream disabled:opacity-40"
                        aria-label={`Fewer ${label.toLowerCase()}`}
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-display text-lg font-bold tabular-nums text-cream">
                        {value}
                      </span>
                      <button
                        onClick={inc}
                        disabled={value >= partySize}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-line transition-colors enabled:hover:border-cream disabled:opacity-40"
                        aria-label={`More ${label.toLowerCase()}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* optional staff / employee referral code */}
            <div className="mt-4">
              <label htmlFor="empref" className="label mb-1.5 block !text-[0.5625rem]">
                Employee referral code <span className="!text-muted">(optional)</span>
              </label>
              <input
                id="empref"
                value={empref}
                onChange={(e) => setEmpref(e.target.value.toUpperCase().slice(0, 32))}
                placeholder="e.g. STAFF01"
                autoCapitalize="characters"
                className="w-full rounded-md border border-line bg-transparent px-3 py-2.5 text-base uppercase tracking-wide text-cream placeholder:normal-case placeholder:text-muted/50 focus:border-primary focus:outline-none sm:text-sm"
              />
            </div>

            {/* quote */}
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Minimum Spend</dt>
                <dd className="tabular-nums">{inrExact(quote.minimumSpend)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Deposit Now ({depositPercent}%)</dt>
                <dd className="tabular-nums">{inrExact(quote.depositAmount)}</dd>
              </div>
              {/* booking fee with expandable CGST/SGST breakdown */}
              <button
                type="button"
                onClick={() => setShowFeeBreakdown((v) => !v)}
                className="flex w-full items-center justify-between gap-4"
                aria-expanded={showFeeBreakdown}
              >
                <span className="flex items-center gap-1.5 text-muted">
                  Booking Fee + GST
                  <span
                    className={`inline-block text-xs transition-transform duration-300 ${
                      showFeeBreakdown ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </span>
                <span className="tabular-nums">{inrExact(quote.baseamount)}</span>
              </button>
              <div
                className={`grid transition-all duration-300 ${
                  showFeeBreakdown ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-2 pl-3 text-xs text-muted">
                    <div className="flex justify-between gap-4">
                      <span>Base Fee</span>
                      <span className="tabular-nums">{inrExact(quote.bookingFee)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>CGST (9%)</span>
                      <span className="tabular-nums">{inrExact(quote.cgst)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>SGST (9%)</span>
                      <span className="tabular-nums">{inrExact(quote.cgst)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-1 flex justify-between gap-4 rounded-md border border-line bg-elevated px-4 py-3 text-base">
                <dt className="font-display font-semibold uppercase">Pay Now</dt>
                <dd className="h-display tabular-nums">{inrExact(quote.payNowAmount)}</dd>
              </div>
              <p className="text-[0.6875rem] text-muted">
                {inrExact(quote.minimumSpend - quote.depositAmount)} balance is redeemable at the venue.
              </p>
            </dl>

            {/* T&C — inline & expandable so the sheet is never torn down */}
            <TermsDisclosure terms={event?.terms} />

            {error && <p className="mt-3 text-sm text-primary">{error}</p>}

            <button
              onClick={pay}
              disabled={!allWithinRange || phase === "paying"}
              className="mt-5 w-full rounded-full bg-primary py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal disabled:opacity-50"
            >
              {phase === "paying" ? "Opening payment…" : `Book now · ${inrExact(quote.payNowAmount)}`}
            </button>
            {!session && (
              <p className="mt-2 text-center text-xs text-muted">
                You&apos;ll sign in with your mobile number before payment.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
