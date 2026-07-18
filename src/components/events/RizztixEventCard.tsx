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
    <article className="group flex flex-col">
      <TransitionLink
        href={`/event/${event._id}`}
        className="relative block overflow-hidden rounded-sm"
        aria-label={event.title}
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
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
        <span className="label absolute left-4 top-4 rounded-full bg-coal/60 px-3 py-1 !text-cream/90 backdrop-blur-sm">
          {event.isLive ? "● Live now" : eventDate(event.startdatetime)}
        </span>
        {genre && (
          <span className="label absolute right-4 top-4 rounded-full border border-cream/25 px-3 py-1 !text-[0.5625rem] !text-cream/80 backdrop-blur-sm">
            {genre}
          </span>
        )}
      </TransitionLink>

      <div className="flex flex-1 flex-col pt-4">
        <TransitionLink href={`/event/${event._id}`}>
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

        <TransitionLink
          href={`/event/${event._id}`}
          className="mt-4 rounded-full bg-primary py-2.5 text-center text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal"
        >
          Tickets & Info
        </TransitionLink>
      </div>
    </article>
  );
}
