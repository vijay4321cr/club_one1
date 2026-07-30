"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Reveal from "@/components/ui/Reveal";
import FxReveal from "@/components/ui/FxReveal";
import Button from "@/components/ui/Button";
import TransitionLink from "@/components/ui/TransitionLink";
import TicketPurchase from "@/components/events/TicketPurchase";
import ArtistBadge from "@/components/events/ArtistBadge";
import UpcomingGrid from "@/components/events/UpcomingGrid";
import { smoothScrollTo } from "@/components/layout/LenisProvider";
import { useUpcomingEvents } from "@/lib/useUpcoming";
import { eventDateLong, splitNumberedPoints } from "@/lib/format";

/** Event detail, client-fetched — works on fully static hosting. */
export default function EventDetail() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const buy = params.get("buy"); // "1" → arrived from an event click → glide to tickets
  const data = useUpcomingEvents();
  const event = data?.events.find((e) => e._id === id);
  const ticketsRef = useRef<HTMLDivElement>(null);
  const glided = useRef(false);

  useEffect(() => {
    if (event) document.title = `${event.title} — 2BHK`;
  }, [event]);

  // arriving from an event card → let the hero settle, then slowly glide down
  // to the tickets section and stop there. Clear the marker so it fires once.
  useEffect(() => {
    if (!event || buy !== "1" || glided.current) return;
    glided.current = true;
    const t = window.setTimeout(() => {
      if (ticketsRef.current) smoothScrollTo(ticketsRef.current, { offset: -96, duration: 2.4 });
      window.history.replaceState(null, "", `/event/view?id=${id}`);
    }, 700);
    return () => window.clearTimeout(t);
  }, [event, buy, id]);

  /* loading */
  if (data === null) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
        <div className="grid animate-pulse gap-8 md:grid-cols-2 md:items-end">
          <div>
            <div className="h-4 w-40 rounded-sm bg-surface" />
            <div className="mt-4 h-14 w-3/4 rounded-sm bg-surface" />
            <div className="mt-4 h-5 w-1/2 rounded-sm bg-surface" />
          </div>
          <div className="aspect-[4/5] w-full rounded-sm bg-surface" />
        </div>
      </div>
    );
  }

  /* ended / bad link → show what's on now */
  if (!event) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
        <Reveal>
          <p className="label mb-3">Box office</p>
          <h1 className="h-display !normal-case text-4xl sm:text-5xl md:text-6xl">
            That night isn&apos;t on sale<span className="text-primary">.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted">
            The event may have ended or the link is old — here&apos;s everything on sale right
            now.
          </p>
        </Reveal>
        <div className="mt-12">
          <UpcomingGrid />
        </div>
      </div>
    );
  }

  const genre = event.genre?.[0]?.title;
  const language = event.languageList?.[0]?.titleenglish;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
      {/* header */}
      <Reveal>
        <p className="label mb-4">
          <TransitionLink href="/event" className="transition-colors hover:text-primary">
            ← All events
          </TransitionLink>
        </p>
        <div className="grid gap-8 md:grid-cols-2 md:items-end">
          <div>
            <p className="label mb-3 flex items-center gap-2 !text-primary">
              {event.isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
              {event.isLive ? "Happening now" : "Upcoming"}
              {genre ? ` · ${genre}` : ""}
              {language ? ` · ${language}` : ""}
            </p>
            <h1 className="h-display !normal-case text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
              {event.title}
            </h1>
            <p className="mt-5 font-serif text-lg italic text-cream/80 md:text-xl">
              {eventDateLong(event.startdatetime)} — {eventDateLong(event.enddatetime)}
            </p>
            {event.tableBookingEnabled && (
              <div className="mt-6">
                <Button href={`/event/table?event=${event._id}`} variant="outline">
                  Book a Table
                </Button>
              </div>
            )}
          </div>
          <FxReveal effect="burn" className="overflow-hidden rounded-sm">
            <div className="relative aspect-[4/5] w-full border border-cream/15 bg-surface">
              <Image
                src={event.image}
                alt={`${event.title} poster`}
                fill
                sizes="(max-width: 768px) 90vw, 45vw"
                className="object-cover"
                priority
              />
            </div>
          </FxReveal>
        </div>
      </Reveal>

      {/* artists */}
      {event.artistsDetails && event.artistsDetails.length > 0 && (
        <div className="mt-14 border-t border-line pt-10 md:mt-20 md:pt-14">
          <FxReveal effect="wipe">
            <p className="label mb-6">Lineup</p>
          </FxReveal>
          <div className="no-scrollbar -mx-5 flex snap-x gap-6 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            {event.artistsDetails.map((a, i) => (
              <ArtistBadge key={a._id} artist={a} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* about this event (from the box office) */}
      {event.aboutevent?.trim() && (
        <div className="mt-14 border-t border-line pt-10 md:mt-20 md:pt-14">
          <FxReveal effect="wipe">
            <p className="label mb-4">About the event</p>
          </FxReveal>
          <Reveal>
            <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-cream/80 md:text-base">
              {event.aboutevent}
            </p>
          </Reveal>
        </div>
      )}

      {/* tickets — full on-site purchase (login → pay → confirm) */}
      <section ref={ticketsRef} id="tickets" className="scroll-mt-24 mt-14 md:mt-20">
        <TicketPurchase event={event} />
      </section>

      {/* event terms & conditions */}
      {event.terms?.trim() && (
        <div className="mt-14 border-t border-line pt-10 md:mt-20 md:pt-14">
          <FxReveal effect="wipe">
            <p className="label mb-4">Terms &amp; Conditions</p>
          </FxReveal>
          <Reveal>
            {(() => {
              const points = splitNumberedPoints(event.terms ?? "");
              return points.length > 1 ? (
                <ol className="max-w-3xl space-y-2 text-xs leading-relaxed text-muted md:text-sm">
                  {points.map((p, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="shrink-0 text-primary">{i + 1}.</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="max-w-3xl whitespace-pre-line text-xs leading-relaxed text-muted md:text-sm">
                  {event.terms}
                </p>
              );
            })()}
          </Reveal>
        </div>
      )}
    </div>
  );
}
