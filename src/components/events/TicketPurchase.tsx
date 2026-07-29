"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import QrSlider from "@/components/account/QrSlider";
import { bookingSlides, bookingGroups } from "@/components/account/TicketModal";
import { authFetch, ApiError } from "@/lib/auth";
import { getAllTicketDetails, getRizztixEventFresh } from "@/lib/api";
import { openCheckout } from "@/lib/payment";
import { useAuth } from "@/lib/useAuth";
import { inr, inrExact, eventDateLong } from "@/lib/format";
import type {
  RizztixEvent,
  RizztixTicket,
  RizztixOrder,
  RizztixConfirm,
  RizztixTicketLine,
  RizztixTicketDetail,
} from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** compact signature of the live-changing ticket fields — used to skip
 *  re-renders when a poll returns identical data */
const ticketSig = (e: RizztixEvent) =>
  JSON.stringify(
    e.tickets.map((t) => [t._id, t.ticketprice, t.ticketssold, t.totaltickets, t.soldout, t.ticketstatus])
  );

/**
 * Ticket descriptions arrive semicolon-separated and sometimes repeated
 * ("Only Entry.;No cover amount.;ONLY ENTRY") — split, trim and dedupe
 * case-insensitively into clean bullet points.
 */
function ticketPoints(raw: string): string[] {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const piece of (raw ?? "").split(";")) {
    const clean = piece.trim().replace(/[.\s]+$/, "");
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(clean);
  }
  return parts;
}

interface Success {
  bookingref: string;
  amount: number;
  lines: RizztixTicketLine[];
}

/** Multi-category ticket cart → confirmation modal → Cashfree/Razorpay. */
export default function TicketPurchase({ event }: { event: RizztixEvent }) {
  const router = useRouter();
  const { session } = useAuth();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);
  const [successTickets, setSuccessTickets] = useState<RizztixTicketDetail[] | null>(null);
  // set when the box office says sales haven't opened — shown on the CTA, not the popup
  const [notOpenMsg, setNotOpenMsg] = useState("");
  const successRef = useRef<HTMLDivElement>(null);

  // live event data — refreshed by polling so price/availability stay current
  const [liveEvent, setLiveEvent] = useState(event);
  const ticketSigRef = useRef(ticketSig(event));
  const ev = liveEvent;
  // per-ticket "only N available" notice shown when a stepper hits its cap
  const [notice, setNotice] = useState<Record<string, string>>({});
  const avail = (t: RizztixTicket) => Math.max(0, (t.totaltickets ?? 0) - (t.ticketssold ?? 0));

  /* sales not open yet — from the event's booking window, or from the API reply.
     ticks so the CTA unblocks on its own the moment sales open */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // live-poll this event's ticket price + availability (no page refresh needed)
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      const fresh = await getRizztixEventFresh(event._id);
      if (cancelled || !fresh) return;
      const sig = ticketSig(fresh);
      if (sig === ticketSigRef.current) return; // unchanged → no re-render
      ticketSigRef.current = sig;
      setLiveEvent(fresh);
    };
    poll(); // immediate freshen on mount (initial data may be up to ~1 min old)
    const id = window.setInterval(poll, 5_000);
    const onVis = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [event._id]);

  // if live availability drops below what's already in the cart, trim it
  useEffect(() => {
    setQty((q) => {
      let changed = false;
      const next = { ...q };
      for (const t of ev.tickets) {
        const a = avail(t);
        if ((next[t._id] ?? 0) > a) {
          next[t._id] = a;
          changed = true;
        }
      }
      return changed ? next : q;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveEvent]);

  const notStartedYet =
    !!ev.bookingstart && now !== null && new Date(ev.bookingstart).getTime() > now;
  const bookingBlocked = notStartedYet || !!notOpenMsg;
  const blockedLabel = notOpenMsg || "Booking has not started yet. Please try again later.";

  /* ---- selection + totals (fee math mirrors the backend payload) ---- */
  const lines: RizztixTicketLine[] = useMemo(
    () =>
      ev.tickets
        .filter((t) => (qty[t._id] ?? 0) > 0)
        .map((t) => ({
          tickettypeid: t._id,
          tickettype: t.tickettype,
          quantity: qty[t._id],
          ticketprice: t.ticketprice,
        })),
    [ev.tickets, qty]
  );
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.ticketprice, 0);
  const feePercent = ev.bookingpercentage ?? 0;
  const baseprice = round2((subtotal * feePercent) / 100); // fee before GST
  const bookingFee = round2(baseprice * 1.18); // fee incl. 18% GST
  const total = round2(subtotal + bookingFee);

  useEffect(() => {
    document.body.style.overflow = showConfirm ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showConfirm]);

  /* keep the cart alive across navigation (Terms) and the login round-trip */
  const cartKey = `bhk:cart:${event._id}`;
  const resumeKey = `bhk:resume:${event._id}`;

  // restore the cart on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(cartKey);
      if (raw) setQty(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist the cart whenever it changes
  useEffect(() => {
    try {
      if (Object.values(qty).some((n) => n > 0)) {
        sessionStorage.setItem(cartKey, JSON.stringify(qty));
      } else {
        sessionStorage.removeItem(cartKey);
      }
    } catch {
      /* ignore */
    }
  }, [qty, cartKey]);

  // reopen the confirmation popup on return — after login OR after viewing Terms
  useEffect(() => {
    try {
      if (sessionStorage.getItem(resumeKey) && sessionStorage.getItem(cartKey)) {
        sessionStorage.removeItem(resumeKey);
        setShowConfirm(true);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // on success, scroll the panel into view and load this booking's entry QRs
  useEffect(() => {
    if (!success) return;
    let cancelled = false;
    setTimeout(() => successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    (async () => {
      // QR codes can take a moment to mint after payment — retry a few times
      for (let attempt = 0; attempt < 4 && !cancelled; attempt++) {
        try {
          const all = await getAllTicketDetails();
          const mine = all.filter((t) => (t.bookingref ?? "") === success.bookingref);
          if (!cancelled && mine.length) setSuccessTickets(mine);
          if (mine.length && bookingSlides(mine).length) return; // QRs ready
        } catch {
          /* ignore and retry */
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [success]);

  const setCount = (t: RizztixTicket, n: number) => {
    const a = avail(t);
    const hardMax = Math.min(a, 10); // never more than what's left, max 10 per order
    const capped = Math.max(0, Math.min(hardMax, n));
    const msg =
      n > capped
        ? a <= 0
          ? "Sold out"
          : a <= 10
            ? `Only ${a} ticket${a === 1 ? "" : "s"} available`
            : "Max 10 tickets per order"
        : "";
    setNotice((m) => (m[t._id] === msg ? m : { ...m, [t._id]: msg }));
    setQty((q) => ({ ...q, [t._id]: capped }));
  };

  /* remember we were mid-checkout so returning re-opens the popup with the cart */
  const rememberCheckout = () => {
    try {
      sessionStorage.setItem(resumeKey, "1");
      sessionStorage.setItem(cartKey, JSON.stringify(qty));
    } catch {
      /* ignore */
    }
  };

  /* ---------------- payment ---------------- */

  const goLogin = () => {
    rememberCheckout();
    router.push(`/login?next=${encodeURIComponent(`/event/view?id=${event._id}`)}`);
  };

  const pay = async () => {
    if (!session) {
      goLogin();
      return;
    }
    if (lines.length === 0 || paying) return;
    setPaying(true);
    setError("");

    try {
      // 1. create the order — multi-category payload with ticketlines
      const order = await authFetch<RizztixOrder>("/order/buy", {
        body: {
          eventid: event._id,
          noofticket: totalQty,
          ticketprice: round2(subtotal / totalQty),
          amount: total.toFixed(2),
          currency: "INR",
          isdelivery: false,
          deliveryprice: 0,
          tickettypeid: lines[0].tickettypeid,
          gst: round2(baseprice * 0.09).toFixed(2),
          baseamount: bookingFee.toFixed(2),
          baseprice,
          inqueue: false,
          ticketlines: lines,
        },
      });

      // 2. open the gateway (shared Cashfree/Razorpay helper)
      const result = await openCheckout(
        {
          orderid: order.orderid,
          amount: total,
          currency: order.currency,
          payment_session_id: order.payment_session_id,
          cashfreeEnv: order.cashfreeEnv,
          razorpayKeyId: order.razorpayKeyId,
        },
        {
          name: session.user.fullname,
          email: session.user.email,
          contact: session.user.phone,
          description: `${event.title} · ${totalQty} ticket${totalQty > 1 ? "s" : ""}`,
        }
      );

      if (result.status === "dismissed") {
        setPaying(false);
        return;
      }
      if (result.status === "error" || result.status === "no_provider") {
        setError(
          result.status === "error"
            ? result.message
            : "The box office didn't return a payment method — try again later."
        );
        setPaying(false);
        return;
      }

      // 3. MANDATORY confirm — only then show success
      setShowConfirm(false);
      setConfirming(true);
      try {
        const confirmed = await authFetch<RizztixConfirm>("/order/confirmPayment", {
          body:
            result.status === "cashfree"
              ? { order_id: result.order_id, event_id: event._id }
              : {
                  event_id: event._id,
                  razorpay_order_id: result.razorpay_order_id,
                  razorpay_payment_id: result.razorpay_payment_id,
                  razorpay_signature: result.razorpay_signature,
                },
        });
        setSuccess({ bookingref: confirmed.bookingref ?? order.bookingref, amount: total, lines });
        try {
          sessionStorage.removeItem(cartKey);
          sessionStorage.removeItem(resumeKey);
        } catch {
          /* ignore */
        }
      } catch (e) {
        setError(
          e instanceof ApiError
            ? `Payment confirmation failed: ${e.message}. Your booking ref is ${order.bookingref} — if you were charged, check My Account or contact us.`
            : `Payment confirmation failed — your booking ref is ${order.bookingref}. If you were charged, check My Account or contact us.`
        );
      } finally {
        setConfirming(false);
        setPaying(false);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        goLogin();
      } else if (e instanceof ApiError && /not\s*(yet\s*)?started|not\s*open/i.test(e.message)) {
        // sales aren't open — surface it on the CTA, not inside the popup
        setNotOpenMsg(e.message);
        setError("");
        setShowConfirm(false);
      } else {
        setError(e instanceof ApiError ? e.message : "Could not start the booking — try again.");
      }
      setPaying(false);
    }
  };

  /* ---------------- verifying payment ---------------- */
  if (confirming) {
    return (
      <div className="rounded-sm border border-line p-8 text-center md:p-12">
        <p className="label mb-3 flex items-center justify-center gap-2 !text-primary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Payment received
        </p>
        <h3 className="h-display text-3xl md:text-4xl">Confirming your booking…</h3>
        <p className="mt-3 text-sm text-muted">
          Hold on a second — issuing your tickets. Don&apos;t close this page.
        </p>
      </div>
    );
  }

  /* ---------------- success panel ---------------- */
  if (success) {
    const slides = successTickets ? bookingSlides(successTickets) : [];
    return (
      <Reveal>
        <div ref={successRef} className="scroll-mt-28 rounded-sm border border-line p-6 text-center md:p-10">
          <p className="label mb-3 !text-primary">Booking confirmed</p>
          <h3 className="h-display text-3xl md:text-4xl">See you on the floor.</h3>
          <p className="mt-3 text-sm text-muted">
            {/* ticket price excluding booking fee + GST (matches the emailed ticket);
                the ticket-type breakdown now shows on the QR tabs below */}
            {inr(success.lines.reduce((s, l) => s + l.ticketprice * l.quantity, 0))} · Ref{" "}
            <span className="text-cream">{success.bookingref}</span>
          </p>

          {/* entry QR codes — same sliding stub cards as My Account */}
          <div className="mx-auto mt-8 max-w-sm">
            {slides.length > 0 ? (
              <QrSlider
                groups={bookingGroups(successTickets ?? [])}
                codeLabel="Ticket code"
                unit="Pass"
                footnote="Show this at the gate — also saved in My Account"
              />
            ) : (
              <div className="rounded-lg border border-line p-8">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
                <p className="label !text-[0.5625rem] !text-muted">Minting your entry QR codes…</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/account">View my tickets</Button>
            <Button href="/#events" variant="outline">
              More events
            </Button>
          </div>
        </div>
      </Reveal>
    );
  }

  /* ---------------- ticket list + cart bar ---------------- */
  return (
    <>
      <Reveal>
        <div className="mb-6 flex items-baseline justify-between border-b border-line pb-4">
          <p className="label">Tickets</p>
          {ev.bookingend && (
            <p className="hidden text-xs text-muted md:block">
              Booking closes {eventDateLong(ev.bookingend)}
            </p>
          )}
        </div>
      </Reveal>

      <div className="divide-y divide-line">
        {ev.tickets.map((t, i) => {
          const available = avail(t);
          const unavailable =
            t.soldout || t.ticketstatus.toUpperCase() !== "AVAILABLE" || available <= 0;
          const n = qty[t._id] ?? 0;
          return (
            <Reveal key={t._id} delay={i * 0.06}>
              <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl font-medium uppercase md:text-2xl">
                    {t.tickettype}
                  </h3>
                  {(() => {
                    const points = [
                      ...ticketPoints(t.categorydesc),
                      ...(t.passesPerUnit > 1 ? [`Admits ${t.passesPerUnit}`] : []),
                      ...(t.coverAmount > 0 ? [`${inr(t.coverAmount)} cover included`] : []),
                    ];
                    if (!points.length) return null;
                    const open = !!openDetails[t._id];
                    return (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setOpenDetails((d) => ({ ...d, [t._id]: !d[t._id] }))}
                          aria-expanded={open}
                          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted transition-colors hover:text-cream"
                        >
                          Details
                          <span
                            className={`inline-block text-[0.6rem] transition-transform duration-300 ${
                              open ? "rotate-180" : ""
                            }`}
                          >
                            ▾
                          </span>
                        </button>
                        <div
                          className={`grid transition-all duration-300 ${
                            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <ul className="mt-2 space-y-1">
                              {points.map((p, k) => (
                                <li key={k} className="flex gap-2 text-sm text-muted">
                                  <span className="mt-[0.15rem] text-primary">•</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {unavailable ? (
                  <span className="label shrink-0 rounded-full border border-line px-4 py-2">
                    Sold out
                  </span>
                ) : (
                  <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                    <div className="flex items-center gap-5">
                      <span className="h-display w-24 text-right text-xl md:text-2xl">
                        {inr(t.ticketprice)}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setCount(t, n - 1)}
                          disabled={n === 0}
                          aria-label={`Fewer ${t.tickettype} tickets`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-line transition-colors enabled:hover:border-cream disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-display text-lg tabular-nums">{n}</span>
                        <button
                          onClick={() => setCount(t, n + 1)}
                          aria-label={`More ${t.tickettype} tickets`}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:border-cream ${
                            n > 0 ? "border-primary text-primary" : "border-line"
                          }`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {/* live availability feedback */}
                    {notice[t._id] ? (
                      <p className="text-xs font-medium text-primary">{notice[t._id]}</p>
                    ) : available <= 5 ? (
                      <p className="text-xs text-gold">
                        Only {available} ticket{available === 1 ? "" : "s"} left
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>

      {error && !showConfirm && (
        <p className="mt-6 text-sm leading-relaxed text-primary">{error}</p>
      )}
      {!session && (
        <Reveal>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            You&apos;ll be asked to sign in with your mobile number before payment.
          </p>
        </Reveal>
      )}

      {/* sticky cart bar */}
      {totalQty > 0 && (
        <div className="sticky bottom-4 z-30 mt-8">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-full border border-line bg-elevated/95 py-3 pl-6 pr-3 shadow-lg shadow-black/40 backdrop-blur-md">
            {!bookingBlocked && (
              <p className="text-sm">
                <span className="font-display font-medium uppercase">
                  {totalQty} ticket{totalQty > 1 ? "s" : ""}
                </span>
                <span className="text-muted"> · {inr(subtotal)}</span>
              </p>
            )}
            <button
              onClick={() => !bookingBlocked && setShowConfirm(true)}
              disabled={bookingBlocked}
              className={
                bookingBlocked
                  ? "w-full cursor-not-allowed rounded-full bg-line/50 px-5 py-3 text-center text-xs font-medium text-muted"
                  : "rounded-full bg-primary px-6 py-3 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal"
              }
            >
              {bookingBlocked ? blockedLabel : "Review & Buy"}
            </button>
          </div>
        </div>
      )}

      {/* confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-coal/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Booking confirmation"
          onClick={() => !paying && setShowConfirm(false)}
        >
          <div
            data-lenis-prevent
            className="max-h-[92svh] w-full max-w-md overflow-y-auto rounded-md border border-line bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/40 text-cream">
                  ✓
                </span>
                <p className="font-display text-lg font-semibold uppercase tracking-wide">
                  Confirmation
                </p>
              </div>
              <button
                onClick={() => !paying && setShowConfirm(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated transition-colors hover:bg-line"
              >
                ✕
              </button>
            </div>

            {/* summary card */}
            <div className="rounded-md border-l-2 border-cream/60 bg-elevated p-5">
              <div className="space-y-3">
                {lines.map((l) => (
                  <div key={l.tickettypeid} className="flex justify-between gap-4 text-sm">
                    <span className="font-display font-medium uppercase">{l.tickettype}</span>
                    <span className="tabular-nums">
                      {l.quantity} × {inr(l.ticketprice)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="font-display font-medium uppercase">Tickets subtotal</span>
                  <span className="tabular-nums">{inrExact(subtotal)}</span>
                </div>
                {/* booking fee with expandable CGST/SGST breakdown */}
                <button
                  type="button"
                  onClick={() => setShowFeeBreakdown((v) => !v)}
                  className="flex w-full items-center justify-between gap-4"
                  aria-expanded={showFeeBreakdown}
                >
                  <span className="flex items-center gap-1.5 font-display font-medium uppercase text-muted">
                    Booking fee
                    <span
                      className={`inline-block text-xs transition-transform duration-300 ${
                        showFeeBreakdown ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </span>
                  <span className="tabular-nums">{inrExact(bookingFee)}</span>
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    showFeeBreakdown ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-2 pl-3 text-xs text-muted">
                      <div className="flex justify-between gap-4">
                        <span>Base fee</span>
                        <span className="tabular-nums">{inrExact(baseprice)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>CGST (9%)</span>
                        <span className="tabular-nums">{inrExact(baseprice * 0.09)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>SGST (9%)</span>
                        <span className="tabular-nums">{inrExact(baseprice * 0.09)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-between gap-4 rounded-md border border-line bg-surface px-4 py-3">
                <span className="font-display font-semibold uppercase">Total amount</span>
                <span className="h-display text-lg tabular-nums">{inrExact(total)}</span>
              </div>
            </div>

            {/* T&C — opens in a new tab so this confirmation popup stays open
                until the user closes it themselves (no navigation teardown) */}
            <a
              href="/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-between gap-2 rounded-md border border-line p-4 text-xs font-medium uppercase tracking-[0.14em] underline underline-offset-4 transition-colors hover:text-primary"
            >
              Terms and conditions
              <span aria-hidden className="no-underline">↗</span>
            </a>

            {error && <p className="mt-4 text-sm text-primary">{error}</p>}

            {/* actions */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={paying}
                className="flex items-center justify-center whitespace-nowrap rounded-full border border-cream/60 px-2 py-3.5 text-xs font-medium uppercase tracking-[0.1em] text-cream transition-colors hover:bg-cream hover:text-coal disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={pay}
                disabled={paying}
                className="flex items-center justify-center whitespace-nowrap rounded-full bg-cream px-2 py-3.5 text-xs font-medium uppercase tracking-[0.1em] text-coal transition-colors hover:bg-primary hover:text-cream disabled:opacity-60"
              >
                {paying ? "Opening…" : "Continue →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
