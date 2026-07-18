"use client";

import Image from "next/image";
import { passQrs } from "@/components/account/TicketModal";
import { eventDate } from "@/lib/format";
import type { RizztixTicketDetail } from "@/types";

interface Props {
  ticket: RizztixTicketDetail;
  onView: (t: RizztixTicketDetail) => void;
}

/** One ticket row: portrait poster left, booking details + View QR right. */
export default function TicketCard({ ticket: t, onView }: Props) {
  const ev = t.eventDetails;
  const qrCount = passQrs(t).length;

  return (
    <div className="flex gap-4 rounded-sm border border-line p-4 transition-colors hover:border-cream/30 sm:gap-6 sm:p-5">
      {ev?.image && (
        <div className="relative aspect-[3/4] w-28 shrink-0 self-center overflow-hidden rounded-sm bg-surface sm:w-32">
          <Image
            src={ev.image}
            alt={`${ev.title ?? "Event"} poster`}
            fill
            sizes="128px"
            className="object-cover"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="label !text-[0.5625rem]">
          {ev?.startdatetime ? `${eventDate(ev.startdatetime)} · ` : ""}
          {t.bookingref ?? ""}
          {t.orderstatus ? <span className="text-primary"> · {t.orderstatus}</span> : null}
        </p>
        <p className="mt-1 line-clamp-2 font-display text-lg font-medium uppercase leading-tight">
          {ev?.title ?? "2BHK event"}
        </p>

        {/* highlighted category + count */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-primary">
            {t.tickettype ?? "Ticket"}
          </span>
          <span className="rounded-full border border-line px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em]">
            × {t.noofticket ?? 1}
          </span>
          {(t.passesPerUnit ?? 1) > 1 && (
            <span className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-gold">
              Admits {t.passesPerUnit}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4">
          <button
            onClick={() => onView(t)}
            className="rounded-full bg-primary px-5 py-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal"
          >
            View QR{qrCount > 1 ? `s (${qrCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
