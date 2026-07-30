"use client";

import Image from "next/image";
import { bookingSlides, ticketTypeLines, type TicketBooking } from "@/components/account/TicketModal";
import { eventDate } from "@/lib/format";

interface Props {
  booking: TicketBooking;
  onView: (b: TicketBooking) => void;
  /** eager-load the poster when it's the first (above-the-fold) card */
  priority?: boolean;
}

/** One booking row: portrait poster + every ticket type/count, one View QRs button. */
export default function TicketCard({ booking: b, onView, priority = false }: Props) {
  const ev = b.tickets[0]?.eventDetails;
  const lines = ticketTypeLines(b.tickets);
  const qrCount = bookingSlides(b.tickets).length;
  // only a paid/confirmed booking has a valid entry QR — same test as the
  // status pill. Pending / failed orders show a note instead of View QR.
  const status = b.orderstatus ?? "";
  const isPaid = /paid|confirm|success|complete/i.test(status);
  const isPending = /pending|process|await|initiat/i.test(status);

  return (
    <div className="flex gap-4 rounded-sm border border-line p-4 transition-colors hover:border-cream/30 sm:gap-6 sm:p-5">
      {ev?.image && (
        <div className="relative aspect-[4/5] w-28 shrink-0 self-center overflow-hidden rounded-sm border border-cream/15 bg-surface sm:w-32">
          <Image
            src={ev.image}
            alt={`${ev.title ?? "Event"} poster`}
            fill
            priority={priority}
            sizes="128px"
            className="object-cover"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="label !text-[0.5625rem]">
          {ev?.startdatetime ? `${eventDate(ev.startdatetime)} · ` : ""}
          {b.bookingref ?? ""}
          {b.orderstatus ? (
            <span
              className={
                /paid|confirm|success|complete/i.test(b.orderstatus)
                  ? "text-green-500"
                  : "text-primary"
              }
            >
              {" "}
              · {b.orderstatus}
            </span>
          ) : null}
        </p>
        <p className="mt-1 line-clamp-2 font-display text-lg font-medium uppercase leading-tight">
          {ev?.title ?? "2BHK event"}
        </p>

        {/* every ticket type + count in this booking */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {lines.map((l) => (
            <span
              key={l.type}
              className="rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              {l.type} × {l.count}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-4">
          {isPaid ? (
            <button
              onClick={() => onView(b)}
              className="rounded-full bg-primary px-5 py-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal"
            >
              View QR{qrCount > 1 ? `s (${qrCount})` : ""}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {isPending ? "Awaiting payment" : "QR unavailable"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
