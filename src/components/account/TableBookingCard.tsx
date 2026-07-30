"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QrSlider from "@/components/account/QrSlider";
import { inr, eventDate } from "@/lib/format";
import type { TableBooking } from "@/types";

interface Props {
  booking: TableBooking;
  /** open the QR popup on mount (deep-link from ?order=) */
  autoOpen?: boolean;
  /** notify the page so it can reflect the open QR in the URL */
  onOpenChange?: (open: boolean) => void;
}

/** A table booking row with a guest-QR popup (styled ticket-stub slider). */
export default function TableBookingCard({ booking: b, autoOpen, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  const qrs = b.guestQrcodes ?? [];
  const tableCount = b.tableCount ?? 1;
  // show the actual table label(s) — "T1" or, for a multi-table order, "T1 | T3"
  // (grouped bookings carry the joined labels in areaLabel, split by " · ")
  const tableLabels =
    tableCount > 1
      ? (b.areaLabel ?? b.table?.tableLabel ?? "Reserved").split(" · ").join(" | ")
      : b.table?.tableLabel ?? b.areaLabel ?? "Reserved";
  const img = b.eventid?.image;
  const date = b.eventid?.startdatetime ?? b.serviceDate;
  const confirmed = b.status === "CONFIRMED";
  // entry QRs mean the booking is genuinely paid — surface them even if the
  // backend still labels the booking PENDING_PAYMENT (balance due at venue)
  const hasQr = qrs.length > 0;

  const setQrOpen = (v: boolean) => {
    setOpen(v);
    onOpenChange?.(v);
  };

  // deep-link: open on mount when asked (only if there's a QR to show)
  useEffect(() => {
    if (autoOpen && hasQr) setQrOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  return (
    <>
      <div className="flex gap-4 rounded-sm border border-line p-4 transition-colors hover:border-cream/30 sm:gap-6 sm:p-5">
        {img && (
          <div className="relative aspect-[4/5] w-28 shrink-0 self-center overflow-hidden rounded-sm border border-cream/15 bg-surface sm:w-32">
            <Image src={img} alt="" fill sizes="128px" className="object-cover" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="label !text-[0.5625rem]">
            {eventDate(date)} · {b.bookingref}
            <span className={confirmed ? "text-green-500" : "text-gold"}> · {b.status}</span>
          </p>
          <p className="mt-1 line-clamp-2 font-display text-lg font-medium uppercase leading-tight">
            {b.eventTitle ?? b.eventid?.title ?? "2BHK event"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-gold">
              {tableLabels}
            </span>
            <span className="rounded-full border border-line px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em]">
              {b.partySize} pax
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            Paid {inr(b.payNowAmount)} · {inr((b.minimumSpend ?? 0) - (b.depositAmount ?? 0))} balance
            at venue
          </p>
          <div className="mt-auto pt-4">
            {hasQr ? (
              <button
                onClick={() => setQrOpen(true)}
                className="rounded-full bg-primary px-5 py-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal"
              >
                View entry QR{qrs.length > 1 ? `s (${qrs.length})` : ""}
              </button>
            ) : (
              <span className="label !text-gold">Payment pending</span>
            )}
          </div>
        </div>
      </div>

      {open && qrs.length > 0 && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-coal/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setQrOpen(false)}
        >
          <div
            data-lenis-prevent
            className="w-full max-w-md rounded-md border border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold uppercase">{b.bookingref}</p>
                <p className="label !text-[0.5625rem] !text-muted">
                  {qrs.length} guest QR{qrs.length > 1 ? "s · swipe to see all" : ""}
                </p>
              </div>
              <button
                onClick={() => setQrOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elevated transition-colors hover:bg-line"
              >
                ✕
              </button>
            </div>

            <QrSlider
              slides={qrs.map((q) => ({
                qrstring: q.qrstring,
                qrcodeimage: q.qrcodeimage,
                code: q.guestRef || `Guest ${q.guestIndex}`,
              }))}
              codeLabel="Guest code"
              unit="Guest"
              footnote="One QR per guest — show at the door"
            />
          </div>
        </div>
      )}
    </>
  );
}
