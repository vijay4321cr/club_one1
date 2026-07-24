import Image from "next/image";
import TransitionLink from "@/components/ui/TransitionLink";
import type { RizztixEvent } from "@/types";
import { inr, eventDate } from "@/lib/format";

/** Event card for real box-office events from the Rizztix API. */
export default function RizztixEventCard({ event }: { event: RizztixEvent }) {
  const fromPrice = event.tickets.length
    ? Math.min(...event.tickets.map((t) => t.ticketprice))
    : undefined;
  const artists = event.artistsDetails?.map((a) => a.name).join(" · ");
  const genre = event.genre?.[0]?.title;

  return (
    <article className="group flex h-full flex-col">
      <TransitionLink
        href={`/event/view?id=${event._id}&buy=1`}
        className="relative block overflow-hidden rounded-sm"
        aria-label={event.title}
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-cream/15 bg-surface">
          <Image
            src={event.image}
            alt={`${event.title} poster`}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-coal/80 to-transparent"
          />
        </div>
        {/* genre + date — bottom-left corner, over the poster's gradient */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center gap-1.5 sm:bottom-3.5 sm:left-3.5 sm:right-3.5">
          {genre && (
            <span className="label rounded-full bg-coal/90 px-2 py-0.5 !text-[0.5rem] !text-cream ring-1 ring-cream/15 backdrop-blur-md sm:px-3 sm:py-1 sm:!text-[0.5625rem]">
              {genre}
            </span>
          )}
          <span className="label rounded-full bg-coal/80 px-2 py-0.5 !text-[0.5rem] !text-cream/90 backdrop-blur-sm sm:px-3 sm:py-1 sm:!text-[0.5625rem]">
            {event.isLive ? "● Live now" : eventDate(event.startdatetime)}
          </span>
        </div>
      </TransitionLink>

      <div className="flex flex-1 flex-col pt-4">
        <TransitionLink href={`/event/view?id=${event._id}&buy=1`}>
          <h3 className="font-display text-xl font-medium uppercase leading-tight transition-colors group-hover:text-primary md:text-2xl">
            {event.title}
          </h3>
        </TransitionLink>
        {artists && <p className="mt-1.5 line-clamp-1 text-sm text-muted">{artists}</p>}
        {fromPrice !== undefined && (
          <p className="mt-2 text-sm">
            <span className="text-muted">from </span>
            <span className="font-medium">{inr(fromPrice)}</span>
          </p>
        )}

        <div className="mt-auto flex gap-2 pt-4">
          <TransitionLink
            href={`/event/view?id=${event._id}&buy=1`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal sm:py-2.5 sm:text-[0.6875rem] sm:tracking-[0.16em]"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2 2 2 0 000 4 2 2 0 000 4 2 2 0 01-2 2H6a2 2 0 01-2-2 2 2 0 000-4 2 2 0 000-4z" />
              <path d="M14 6.5v11" strokeDasharray="1.5 2" />
            </svg>
            <span className="sm:hidden">Ticket</span>
            <span className="hidden sm:inline">Tickets &amp; Info</span>
          </TransitionLink>
          {event.tableBookingEnabled && (
            <TransitionLink
              href={`/event/table?event=${event._id}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-primary py-2 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-primary transition-colors duration-300 hover:bg-primary hover:text-cream sm:py-2.5 sm:text-[0.6875rem] sm:tracking-[0.16em]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 11V8a2 2 0 012-2h12a2 2 0 012 2v3" />
                <path d="M3 11a2 2 0 012 2v3h14v-3a2 2 0 012-2" strokeLinecap="round" />
                <path d="M6 19v-3M18 19v-3" strokeLinecap="round" />
              </svg>
              <span className="sm:hidden">Table</span>
              <span className="hidden sm:inline">Book a Table</span>
            </TransitionLink>
          )}
        </div>
      </div>
    </article>
  );
}
