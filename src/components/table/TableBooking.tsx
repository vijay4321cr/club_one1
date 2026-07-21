"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import TransitionLink from "@/components/ui/TransitionLink";
import FloorMap from "@/components/table/FloorMap";
import StyledQr from "@/components/account/StyledQr";
import { useAuth } from "@/lib/useAuth";
import { ApiError } from "@/lib/auth";
import { openCheckout } from "@/lib/payment";
import {
  getTableSlots,
  getTableLayouts,
  initTableBooking,
  confirmTableBooking,
} from "@/lib/tableApi";
import { useUpcomingEvents } from "@/lib/useUpcoming";
import { inr } from "@/lib/format";
import type { TableLayout, TableZone, TableSpot, TableGuestQr } from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;
const iso = (d: Date) => d.toISOString().slice(0, 10);

type Phase = "map" | "details" | "paying" | "done";

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
  const [layout, setLayout] = useState<TableLayout | null>(null);
  const [depositPercent, setDepositPercent] = useState(50);
  const [clubId, setClubId] = useState<string | undefined>();
  const [loadingMap, setLoadingMap] = useState(false);
  const [mapError, setMapError] = useState("");

  const [selected, setSelected] = useState<{ zone: TableZone; table: TableSpot } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [phase, setPhase] = useState<Phase>("map");
  const [male, setMale] = useState(1);
  const [female, setFemale] = useState(0);
  const [error, setError] = useState("");
  const [guestQrs, setGuestQrs] = useState<TableGuestQr[] | null>(null);
  const [bookingRef, setBookingRef] = useState("");
  const [qrIdx, setQrIdx] = useState(0);

  // lock page scroll while the booking sheet is open
  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

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
    setSelected(null);
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
      setLayout(first);
      setDepositPercent(lay?.depositPercent ?? 50);
      setClubId(lay?.clubId);
      if (!first) setMapError("Floor plan unavailable for this night.");
      setLoadingMap(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceDate, eventId, event]);

  const partySize = male + female;
  const table = selected?.table;
  const withinRange = table ? partySize >= table.minPartySize && partySize <= table.maxPartySize : false;

  // quote (matches the real 2BHK HAR to the paisa)
  const quote = useMemo(() => {
    if (!table) return null;
    const minimumSpend = round2(table.priceFromPerPerson * partySize);
    const depositAmount = round2((minimumSpend * depositPercent) / 100);
    const bookingPct = event?.bookingpercentage ?? 5;
    const bookingFee = round2((minimumSpend * bookingPct) / 100);
    const gst = round2(bookingFee * 0.18);
    const cgst = round2(bookingFee * 0.09);
    const baseamount = round2(bookingFee + gst);
    const payNowAmount = round2(depositAmount + baseamount);
    return {
      minimumSpend,
      depositAmount,
      bookingFee,
      gst,
      cgst,
      baseamount,
      payNowAmount,
    };
  }, [table, partySize, depositPercent, event]);

  const dateBounds = useMemo(() => {
    if (!event) return { min: "", max: "" };
    const today = iso(new Date());
    const start = iso(new Date(event.startdatetime));
    const end = iso(new Date(event.enddatetime));
    return { min: start > today ? start : today, max: end };
  }, [event]);

  /* ---------- pay ---------- */
  const pay = async () => {
    if (!layout || !table || !quote) return;
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(`/event/table?event=${eventId}`)}`);
      return;
    }
    if (!withinRange) {
      setError(`This table seats ${table.minPartySize}–${table.maxPartySize} guests.`);
      return;
    }
    setError("");
    setPhase("paying");
    try {
      const init = await initTableBooking({
        layoutId: layout._id,
        areaId: table._id,
        serviceDate,
        slotKey,
        partySize,
        malePax: male,
        femalePax: female,
        clubId,
        eventId,
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
      const result = await openCheckout(
        {
          orderid: b.orderid,
          amount: b.payNowAmount ?? quote.payNowAmount,
          currency: b.currency,
          payment_session_id: b.payment_session_id,
          cashfreeEnv: b.cashfreeEnv,
          razorpayKeyId: b.razorpayKeyId,
        },
        {
          name: session.user.fullname,
          email: session.user.email,
          contact: session.user.phone,
          description: `${event?.title ?? "2BHK"} · ${table.label} · ${partySize} pax`,
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

      const { booking } = await confirmTableBooking({
        bookingId: init.booking._id,
        eventId,
        cashfree: result.status === "cashfree" ? { order_id: result.order_id } : undefined,
        razorpay: result.status === "razorpay" ? result : undefined,
      });
      setBookingRef(booking.bookingref ?? init.booking.bookingref);
      setGuestQrs(booking.guestQrcodes ?? []);
      setPhase("done");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/event/table?event=${eventId}`)}`);
        return;
      }
      setError(
        e instanceof ApiError ? e.message : "Could not complete the booking — please try again."
      );
      setPhase("details");
    }
  };

  /* ---------- no event ---------- */
  if (eventsData && !event) {
    return (
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
        <p className="label mb-3">Table booking</p>
        <h1 className="h-display text-4xl md:text-5xl">
          Pick an event first<span className="text-primary">.</span>
        </h1>
        <Button href="/event" className="mt-8">
          Browse events
        </Button>
      </div>
    );
  }

  /* ---------- success ---------- */
  if (phase === "done") {
    const qrs = guestQrs ?? [];
    return (
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-28 text-center md:pt-36">
        <p className="label mb-3 !text-primary">Table confirmed</p>
        <h1 className="h-display text-4xl md:text-5xl">Your table&apos;s locked in.</h1>
        <p className="mt-3 text-sm text-muted">
          {event?.title} · {selected?.table.label} · {partySize} guests · Ref{" "}
          <span className="text-cream">{bookingRef}</span>
        </p>
        {qrs.length > 0 && (
          <div className="mt-8">
            <div className="mx-auto w-64 overflow-hidden rounded-lg bg-cream text-coal">
              <div className="p-5">
                {qrs[qrIdx]?.qrstring ? (
                  <StyledQr data={qrs[qrIdx].qrstring!} className="mx-auto h-44 w-44" />
                ) : qrs[qrIdx]?.qrcodeimage ? (
                  <div className="relative mx-auto h-44 w-44">
                    <Image
                      src={qrs[qrIdx].qrcodeimage!}
                      alt="Entry QR"
                      fill
                      sizes="176px"
                      className="object-contain"
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between border-t-2 border-dashed border-coal/20 px-5 py-3">
                <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.2em] text-coal/50">
                  Guest {qrs[qrIdx]?.guestIndex}
                </span>
                <span className="font-display text-base font-bold uppercase">
                  <span className="text-primary">2</span>BHK
                </span>
              </div>
            </div>
            {qrs.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                {qrs.map((q, i) => (
                  <button
                    key={q.guestIndex}
                    onClick={() => setQrIdx(i)}
                    aria-label={`Guest ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === qrIdx ? "w-6 bg-primary" : "w-2 bg-line"
                    }`}
                  />
                ))}
              </div>
            )}
            <p className="label mt-4">
              {qrs.length} guest QR{qrs.length > 1 ? "s" : ""} · also in My Account
            </p>
          </div>
        )}
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
            <h1 className="h-display text-3xl sm:text-4xl md:text-5xl">Book a table</h1>
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

      {loadingMap ? (
        <div className="mt-8 aspect-[4/3] w-full animate-pulse rounded-sm bg-surface sm:aspect-[16/10]" />
      ) : mapError ? (
        <div className="mt-8 rounded-sm border border-line p-10 text-center">
          <p className="h-display text-2xl">{mapError}</p>
          <p className="mt-3 text-sm text-muted">Try another night.</p>
        </div>
      ) : layout ? (
        <div className="mt-8">
          <FloorMap layout={layout} selected={selected} onSelect={(zone, t) => setSelected({ zone, table: t })} />
        </div>
      ) : null}

      {/* slim Book Now bar — rises from the bottom once a table is picked */}
      {table && !showModal && (
        <div className="sticky bottom-4 z-30 mt-6">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-full border border-line bg-elevated/95 py-3 pl-6 pr-3 shadow-lg shadow-black/40 backdrop-blur-md">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-medium uppercase">
                {selected?.zone.label} · {table.label}
              </p>
              <p className="text-xs text-muted">{inr(table.priceFromPerPerson)}/pax</p>
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
      {table && quote && showModal && (
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
                <p className="label mb-1">Your table</p>
                <p className="font-display text-xl font-semibold uppercase leading-tight">
                  {selected?.zone.label} · {table.label}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {inr(table.priceFromPerPerson)}/pax · seats {table.minPartySize}–
                  {table.maxPartySize}
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

            {/* party size + gender split (required) */}
            <p className="label mb-3">Party size</p>
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ["Men", male, setMale],
                  ["Women", female, setFemale],
                ] as [string, number, (n: number) => void][]
              ).map(([label, val, set]) => (
                <div key={label} className="rounded-md border border-line p-3">
                  <p className="label mb-2 !text-[0.5625rem]">{label}</p>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => set(Math.max(0, val - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line transition-colors hover:border-cream"
                      aria-label={`Fewer ${label}`}
                    >
                      −
                    </button>
                    <span className="font-display text-lg tabular-nums">{val}</span>
                    <button
                      onClick={() => set(val + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line transition-colors hover:border-cream"
                      aria-label={`More ${label}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              Party of <span className="text-cream">{partySize}</span>
              {!withinRange && partySize > 0 && (
                <span className="text-primary">
                  {" "}
                  · seats {table.minPartySize}–{table.maxPartySize} only
                </span>
              )}
              {partySize === 0 && <span className="text-primary"> · add at least 1 guest</span>}
            </p>

            {/* quote */}
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">
                  Minimum spend ({inr(table.priceFromPerPerson)} × {partySize})
                </dt>
                <dd className="tabular-nums">{inr(quote.minimumSpend)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Deposit now ({depositPercent}%)</dt>
                <dd className="tabular-nums">{inr(quote.depositAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Booking fee + GST</dt>
                <dd className="tabular-nums">{inr(quote.baseamount)}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-4 rounded-md border border-line bg-elevated px-4 py-3 text-base">
                <dt className="font-display font-semibold uppercase">Pay now</dt>
                <dd className="h-display tabular-nums">{inr(quote.payNowAmount)}</dd>
              </div>
              <p className="text-[0.6875rem] text-muted">
                {inr(quote.minimumSpend - quote.depositAmount)} balance is redeemable at the venue.
              </p>
            </dl>

            {error && <p className="mt-3 text-sm text-primary">{error}</p>}

            <button
              onClick={pay}
              disabled={!withinRange || phase === "paying"}
              className="mt-5 w-full rounded-full bg-primary py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal disabled:opacity-50"
            >
              {phase === "paying" ? "Opening payment…" : `Book now · ${inr(quote.payNowAmount)}`}
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
