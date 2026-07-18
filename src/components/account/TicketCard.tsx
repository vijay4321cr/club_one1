"use client";

import Image from "next/image";
import { passQrs } from "@/components/account/TicketModal";
import { eventDate } from "@/lib/format";
import type { RizztixTicketDetail } from "@/types";

interface Props {
  ticket: RizztixTicketDetail;
  onView: (t: RizztixTicketDetail) => void;
}

/** One ticket row: poster, ref/status, category chips + "View QR" button. */
export default function TicketCard({ ticket: t, onView }: Props) {
  const ev = t.eventDetails;
  const qrCount = passQrs(t).length;

  return (
    <div className="flex flex-col gap-5 rounded-sm border border-line p-5 transition-colors hover:border-cream/30 sm:flex-row sm:items-center">
      {ev?.image && (
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-sm bg-surface sm:aspect-square sm:w-24">
          <Image
            src={ev.image}
            alt={`${ev.title ?? "Event"} poster`}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex-1">
        <p className="label !text-[0.5625rem]">
          {ev?.startdatetime ? `${eventDate(ev.startdatetime)} · ` : ""}
          {t.bookingref ?? ""}
          {t.orderstatus ? <span className="text-primary"> · {t.orderstatus}</span> : null}
        </p>
        <p className="mt-1 font-display text-lg font-medium uppercase leading-tight">
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
      </div>
      <button
        onClick={() => onView(t)}
        className="shrink-0 self-start rounded-full bg-primary px-6 py-3 text-[0.75rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal sm:self-center"
      >
        View QR{qrCount > 1 ? `s (${qrCount})` : ""}
      </button>
    </div>
  );
}
