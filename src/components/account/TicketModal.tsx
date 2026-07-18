"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import StyledQr from "@/components/account/StyledQr";
import { inr, eventDateLong } from "@/lib/format";
import type { RizztixTicketDetail, RizztixPassQr } from "@/types";

/** every pass QR of a ticket unit (Couple Entry = 2 passes = 2 QRs) */
export function passQrs(t: RizztixTicketDetail): RizztixPassQr[] {
  if (t.passQrcodes?.length) return t.passQrcodes;
  if (t.qrcodeimages?.length) {
    return t.qrcodeimages.map((url, i) => ({
      passIndex: i + 1,
      ticketId: t.ticketid ?? "",
      qrcodeimage: url,
    }));
  }
  if (t.qrcodeimage) {
    return [{ passIndex: 1, ticketId: t.ticketid ?? "", qrcodeimage: t.qrcodeimage }];
  }
  return [];
}

interface Props {
  ticket: RizztixTicketDetail;
  onClose: () => void;
}

/** Ticket details + QR pass slider in an animated popup. */
export default function TicketModal({ ticket, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const [idx, setIdx] = useState(0);

  const qrs = passQrs(ticket);
  const ev = ticket.eventDetails;

  /* open animation */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
      gsap.fromTo(
        panelRef.current,
        { y: 48, autoAlpha: 0, scale: 0.96 },
        { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, ease: "power3.out", delay: 0.05 }
      );
      gsap.fromTo(
        ".tm-stagger",
        { y: 16, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.06, delay: 0.2, ease: "power2.out" }
      );
    });
    return () => {
      document.body.style.overflow = "";
      ctx.revert();
    };
  }, []);

  /* close with reverse animation */
  const close = useCallback(() => {
    const tl = gsap.timeline({ onComplete: onClose });
    tl.to(panelRef.current, { y: 32, autoAlpha: 0, scale: 0.97, duration: 0.25, ease: "power2.in" });
    tl.to(overlayRef.current, { autoAlpha: 0, duration: 0.2 }, "-=0.1");
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setIdx((i) => Math.min(qrs.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, qrs.length]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-70 flex items-center justify-center bg-coal/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Ticket details"
      onClick={close}
    >
      <div
        ref={panelRef}
        data-lenis-prevent
        className="max-h-[92svh] w-full max-w-sm overflow-y-auto rounded-md border border-line bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="tm-stagger">
            <p className="label !text-[0.5625rem]">
              {ticket.bookingref}
              {ticket.orderstatus && <span className="text-primary"> · {ticket.orderstatus}</span>}
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold uppercase leading-tight">
              {ev?.title ?? "2BHK event"}
            </h3>
            {ev?.startdatetime && (
              <p className="mt-1 text-xs text-muted">{eventDateLong(ev.startdatetime)}</p>
            )}
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elevated transition-colors hover:bg-line"
          >
            ✕
          </button>
        </div>

        {/* ticket meta */}
        <div className="tm-stagger flex flex-wrap items-center gap-2 px-5 pt-4">
          <span className="rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-primary">
            {ticket.tickettype ?? "Ticket"}
          </span>
          <span className="rounded-full border border-line px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em]">
            × {ticket.noofticket ?? 1}
          </span>
          {(ticket.passesPerUnit ?? 1) > 1 && (
            <span className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-gold">
              Admits {ticket.passesPerUnit}
            </span>
          )}
          {typeof ticket.ticketprice === "number" && (
            <span className="ml-auto font-display text-lg">
              {inr(ticket.ticketprice * (ticket.noofticket ?? 1))}
            </span>
          )}
        </div>

        {/* QR slider */}
        <div className="tm-stagger p-5">
          <div
            className="overflow-hidden"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (dx < -40) setIdx((i) => Math.min(qrs.length - 1, i + 1));
              if (dx > 40) setIdx((i) => Math.max(0, i - 1));
              touchX.current = null;
            }}
          >
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${idx * 100}%)` }}
            >
              {qrs.map((q) => (
                <div
                  key={q.passIndex}
                  className="flex min-w-full flex-col items-center px-2"
                  aria-hidden={qrs[idx].passIndex !== q.passIndex}
                >
                  {/* themed ticket stub */}
                  <div className="w-64 overflow-hidden rounded-lg bg-cream text-coal shadow-lg shadow-black/40">
                    {/* scan zone — brand-styled QR generated from qrstring */}
                    <div className="p-5 pb-4">
                      <div className="relative mx-auto h-48 w-48">
                        {q.qrstring ? (
                          <StyledQr data={q.qrstring} className="h-full w-full" />
                        ) : (
                          q.qrcodeimage && (
                            <Image
                              src={q.qrcodeimage}
                              alt={`Entry QR ${q.ticketId}`}
                              fill
                              sizes="192px"
                              className="object-contain"
                            />
                          )
                        )}
                      </div>
                    </div>

                    {/* perforated tear line */}
                    <div className="relative flex items-center">
                      <span aria-hidden className="absolute -left-3 h-6 w-6 rounded-full bg-surface" />
                      <span aria-hidden className="absolute -right-3 h-6 w-6 rounded-full bg-surface" />
                      <span aria-hidden className="mx-5 w-full border-t-2 border-dashed border-coal/20" />
                    </div>

                    {/* stub: code + brand */}
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-[0.5625rem] font-semibold uppercase tracking-[0.2em] text-coal/50">
                          Ticket code
                        </p>
                        <p className="font-display text-xl font-semibold uppercase tracking-[0.1em]">
                          {q.ticketId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-bold uppercase leading-none">
                          <span className="text-primary">2</span>BHK
                        </p>
                        {qrs.length > 1 && (
                          <p className="mt-1 text-[0.5625rem] font-semibold uppercase tracking-[0.2em] text-coal/50">
                            Pass {q.passIndex}/{qrs.length}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* slider controls */}
          {qrs.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-5">
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                aria-label="Previous pass"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line transition-colors enabled:hover:border-cream disabled:opacity-30"
              >
                ←
              </button>
              <div className="flex items-center gap-2">
                {qrs.map((q, i) => (
                  <button
                    key={q.passIndex}
                    onClick={() => setIdx(i)}
                    aria-label={`Go to pass ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === idx ? "w-6 bg-primary" : "w-2 bg-line hover:bg-cream/40"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setIdx((i) => Math.min(qrs.length - 1, i + 1))}
                disabled={idx === qrs.length - 1}
                aria-label="Next pass"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line transition-colors enabled:hover:border-cream disabled:opacity-30"
              >
                →
              </button>
            </div>
          )}

          <p className="label mt-5 text-center !text-[0.5625rem]">Show this at the door</p>
        </div>
      </div>
    </div>
  );
}
