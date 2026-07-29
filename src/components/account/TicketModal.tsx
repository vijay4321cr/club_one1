"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import QrSlider, { type QrSlide, type QrGroup } from "@/components/account/QrSlider";
import { inr, eventDateLong } from "@/lib/format";
import type { RizztixTicketDetail, RizztixPassQr } from "@/types";

/**
 * Every pass QR of a ticket unit (Couple Entry = 2 passes = 2 QRs).
 * Always surfaces `qrstring` wherever it lives (pass-level or ticket-level) so
 * the QR can be generated on-device instead of loading a remote image link.
 */
export function passQrs(t: RizztixTicketDetail): RizztixPassQr[] {
  if (t.passQrcodes?.length) {
    return t.passQrcodes.map((q, i) => ({
      passIndex: q.passIndex ?? i + 1,
      ticketId: q.ticketId ?? t.ticketid ?? "",
      qrcodeimage: q.qrcodeimage ?? t.qrcodeimage,
      qrstring: q.qrstring ?? t.qrstring,
      qrcode: q.qrcode ?? t.qrcode,
    }));
  }
  if (t.qrcodeimages?.length) {
    return t.qrcodeimages.map((url, i) => ({
      passIndex: i + 1,
      ticketId: t.ticketid ?? "",
      qrcodeimage: url,
      qrstring: t.qrstring,
      qrcode: t.qrcode,
    }));
  }
  if (t.qrstring || t.qrcodeimage || t.qrcode) {
    return [
      {
        passIndex: 1,
        ticketId: t.ticketid ?? "",
        qrcodeimage: t.qrcodeimage,
        qrstring: t.qrstring,
        qrcode: t.qrcode,
      },
    ];
  }
  return [];
}

/** All tickets that belong to one booking reference. */
export interface TicketBooking {
  key: string;
  bookingref?: string;
  orderid?: string;
  orderstatus?: string;
  tickets: RizztixTicketDetail[];
}

/** Group a flat ticket list into one entry per booking ref (orderid/_id fallback). */
export function groupTickets(tickets: RizztixTicketDetail[]): TicketBooking[] {
  const map = new Map<string, RizztixTicketDetail[]>();
  const order: string[] = [];
  for (const t of tickets) {
    const key = t.bookingref || t.orderid || t._id;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(t);
  }
  return order.map((key) => {
    const ts = map.get(key)!;
    return {
      key,
      bookingref: ts[0].bookingref,
      orderid: ts[0].orderid,
      orderstatus: ts[0].orderstatus,
      tickets: ts,
    };
  });
}

/** Every pass across every ticket of a booking, as QR-slider slides. */
export function bookingSlides(tickets: RizztixTicketDetail[]): QrSlide[] {
  return tickets.flatMap((t) =>
    passQrs(t).map((q) => ({
      qrstring: q.qrstring,
      qrcode: q.qrcode,
      qrcodeimage: q.qrcodeimage,
      code: q.ticketId || t.ticketid || t.bookingref || "",
    }))
  );
}

/**
 * The booking's passes split by ticket category (VIP, Couple Entry, …) so the
 * QR slider can show a tab per category — otherwise you can't tell which QR
 * belongs to which pass type.
 */
export function bookingGroups(tickets: RizztixTicketDetail[]): QrGroup[] {
  const map = new Map<string, QrSlide[]>();
  const order: string[] = [];
  for (const t of tickets) {
    const label = t.tickettype ?? "Ticket";
    if (!map.has(label)) {
      map.set(label, []);
      order.push(label);
    }
    map.get(label)!.push(
      ...passQrs(t).map((q) => ({
        qrstring: q.qrstring,
        qrcode: q.qrcode,
        qrcodeimage: q.qrcodeimage,
        code: q.ticketId || t.ticketid || t.bookingref || "",
      }))
    );
  }
  return order.map((label) => ({ label, slides: map.get(label)! }));
}

/** distinct ticket types of a booking with summed counts */
export function ticketTypeLines(tickets: RizztixTicketDetail[]): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const t of tickets) {
    const type = t.tickettype ?? "Ticket";
    if (!counts.has(type)) order.push(type);
    counts.set(type, (counts.get(type) ?? 0) + (t.noofticket ?? 1));
  }
  return order.map((type) => ({ type, count: counts.get(type)! }));
}

interface Props {
  booking: TicketBooking;
  onClose: () => void;
}

/** A whole booking's details + all its pass QRs in an animated popup. */
export default function TicketModal({ booking, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const tickets = booking.tickets;
  const first = tickets[0];
  const ev = first?.eventDetails;
  const groups = bookingGroups(tickets);
  const total = tickets.reduce((s, t) => s + (t.ticketprice ?? 0) * (t.noofticket ?? 1), 0);

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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

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
              {booking.bookingref}
              {booking.orderstatus && (
                <span
                  className={
                    /paid|confirm|success|complete/i.test(booking.orderstatus)
                      ? "text-green-500"
                      : "text-primary"
                  }
                >
                  {" "}
                  · {booking.orderstatus}
                </span>
              )}
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

        {/* booking meta — total paid (ticket types now live on the QR tabs below) */}
        {total > 0 && (
          <div className="tm-stagger flex items-center justify-between gap-2 px-5 pt-4">
            <span className="label !text-[0.5625rem] !text-muted">Total paid</span>
            <span className="font-display text-lg">{inr(total)}</span>
          </div>
        )}

        {/* every pass QR across the booking */}
        <div className="tm-stagger p-5">
          <QrSlider
            groups={groups}
            codeLabel="Ticket code"
            unit="Pass"
            footnote="Show this at the gate"
          />
        </div>
      </div>
    </div>
  );
}
