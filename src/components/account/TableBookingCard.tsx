"use client";

import { useState } from "react";
import Image from "next/image";
import StyledQr from "@/components/account/StyledQr";
import { inr, eventDate } from "@/lib/format";
import type { TableBooking } from "@/types";

/** A table booking row with a guest-QR popup (styled ticket-stub slider). */
export default function TableBookingCard({ booking: b }: { booking: TableBooking }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const qrs = b.guestQrcodes ?? [];
  const img = b.eventid?.image;
  const date = b.eventid?.startdatetime ?? b.serviceDate;
  const confirmed = b.status === "CONFIRMED";

  return (
    <>
      <div className="flex gap-4 rounded-sm border border-line p-4 transition-colors hover:border-cream/30 sm:gap-6 sm:p-5">
        {img && (
          <div className="relative aspect-[3/4] w-28 shrink-0 self-center overflow-hidden rounded-sm bg-surface sm:w-32">
            <Image src={img} alt="" fill sizes="128px" className="object-cover" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="label !text-[0.5625rem]">
            {eventDate(date)} · {b.bookingref}
            <span className={confirmed ? "text-primary" : "text-gold"}> · {b.status}</span>
          </p>
          <p className="mt-1 line-clamp-2 font-display text-lg font-medium uppercase leading-tight">
            {b.eventTitle ?? b.eventid?.title ?? "2BHK event"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-gold">
              Table · {b.table?.tableLabel ?? b.areaLabel ?? "reserved"}
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
            {confirmed && qrs.length > 0 ? (
              <button
                onClick={() => {
                  setIdx(0);
                  setOpen(true);
                }}
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
          onClick={() => setOpen(false)}
        >
          <div
            data-lenis-prevent
            className="w-full max-w-sm rounded-md border border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg font-semibold uppercase">{b.bookingref}</p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated transition-colors hover:bg-line"
              >
                ✕
              </button>
            </div>

            <div className="mx-auto w-full max-w-[16rem] overflow-hidden rounded-lg bg-cream text-coal">
              <div className="p-5">
                {qrs[idx]?.qrstring ? (
                  <StyledQr data={qrs[idx].qrstring!} className="mx-auto h-44 w-44" />
                ) : qrs[idx]?.qrcodeimage ? (
                  <div className="relative mx-auto h-44 w-44">
                    <Image
                      src={qrs[idx].qrcodeimage!}
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
                  Guest {qrs[idx]?.guestIndex} of {qrs.length}
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
                    onClick={() => setIdx(i)}
                    aria-label={`Guest ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === idx ? "w-6 bg-primary" : "w-2 bg-line hover:bg-cream/40"
                    }`}
                  />
                ))}
              </div>
            )}
            <p className="label mt-4 text-center !text-[0.5625rem]">One QR per guest — show at the door</p>
          </div>
        </div>
      )}
    </>
  );
}
