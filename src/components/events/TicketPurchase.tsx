"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import TransitionLink from "@/components/ui/TransitionLink";
import QrSlider from "@/components/account/QrSlider";
import { bookingSlides, bookingGroups } from "@/components/account/TicketModal";
import { authFetch, ApiError } from "@/lib/auth";
import { getAllTicketDetails } from "@/lib/api";
import { openCheckout } from "@/lib/payment";
import { useAuth } from "@/lib/useAuth";
import { inr, inrExact, eventDateLong } from "@/lib/format";
import type {
  RizztixEvent,
  RizztixOrder,
  RizztixConfirm,
  RizztixTicketLine,
  RizztixTicketDetail,
} from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

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

  /* sales not open yet — from the event's booking window, or from the API reply.
     ticks so the CTA unblocks on its own the moment sales open */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const notStartedYet =
    !!event.bookingstart && now !== null && new Date(event.bookingstart).getTime() > now;
  const bookingBlocked = notStartedYet || !!notOpenMsg;
  const blockedLabel = notOpenMsg || "Booking has not started yet. Please try again later.";

  /* ---- selection + totals (fee math mirrors the backend payload) ---- */
  const lines: RizztixTicketLine[] = useMemo(
    () =>
      event.tickets
        .filter((t) => (qty[t._id] ?? 0) > 0)
        .map((t) => ({
          tickettypeid: t._id,
          tickettype: t.tickettype,
          quantity: qty[t._id],
          ticketprice: t.ticketprice,
        })),
    [event.tickets, qty]
  );
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.ticketprice, 0);
  const feePercent = event.bookingpercentage ?? 0;
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

  const setCount = (id: string, n: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(10, n)) }));

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
            {success.lines.map((l) => `${l.tickettype} × ${l.quantity}`).join(" · ")} ·{" "}
            {inr(success.amount)} · Ref <span className="text-cream">{success.bookingref}</span>
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
          {event.bookingend && (
            <p className="hidden text-xs text-muted md:block">
              Booking closes {eventDateLong(event.bookingend)}
            </p>
          )}
        </div>
      </Reveal>

      <div className="divide-y divide-line">
        {event.tickets.map((t, i) => {
          const unavailable = t.soldout || t.ticketstatus.toUpperCase() !== "AVAILABLE";
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
                    return points.length ? (
                      <ul className="mt-2 space-y-1">
                        {points.map((p, k) => (
                          <li key={k} className="flex gap-2 text-sm text-muted">
                            <span className="mt-[0.15rem] text-primary">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null;
                  })()}
                </div>

                {unavailable ? (
                  <span className="label shrink-0 rounded-full border border-line px-4 py-2">
                    Sold out
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center gap-5">
                    <span className="h-display w-24 text-right text-xl md:text-2xl">
                      {inr(n > 0 ? t.ticketprice * n : t.ticketprice)}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCount(t._id, n - 1)}
                        disabled={n === 0}
                        aria-label={`Fewer ${t.tickettype} tickets`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-line transition-colors enabled:hover:border-cream disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-display text-lg tabular-nums">
                        {n}
                      </span>
                      <button
                        onClick={() => setCount(t._id, n + 1)}
                        aria-label={`More ${t.tickettype} tickets`}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:border-cream ${
                          n > 0 ? "border-primary text-primary" : "border-line"
                        }`}
                      >
                        +
                      </button>
                    </div>
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

            {/* T&C — same-tab; we remember the checkout so Back re-opens this popup */}
            <TransitionLink
              href="/legal/terms"
              onNavigate={rememberCheckout}
              className="mt-4 flex items-center justify-between gap-2 rounded-md border border-line p-4 text-xs font-medium uppercase tracking-[0.14em] underline underline-offset-4 transition-colors hover:text-primary"
            >
              Terms and conditions
              <span aria-hidden className="no-underline">→</span>
            </TransitionLink>

            {error && <p className="mt-4 text-sm text-primary">{error}</p>}

            {/* actions */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={paying}
                className="rounded-full border border-cream/60 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors hover:bg-cream hover:text-coal disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={pay}
                disabled={paying}
                className="rounded-full bg-cream py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-coal transition-colors hover:bg-primary hover:text-cream disabled:opacity-60"
              >
                {paying ? "Opening…" : "Yes, continue →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
