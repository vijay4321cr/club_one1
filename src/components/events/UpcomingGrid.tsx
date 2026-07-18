"use client";

import RizztixEventCard from "@/components/events/RizztixEventCard";
import FxReveal from "@/components/ui/FxReveal";
import Reveal from "@/components/ui/Reveal";
import { useUpcomingEvents } from "@/lib/useUpcoming";

/** Live events grid with loading skeleton + empty state (client-fetched). */
export default function UpcomingGrid() {
  const data = useUpcomingEvents();

  if (data === null) {
    return (
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[4/5] w-full rounded-sm bg-surface" />
            <div className="mt-4 h-5 w-3/4 rounded-sm bg-surface" />
            <div className="mt-2 h-4 w-1/2 rounded-sm bg-surface" />
          </div>
        ))}
      </div>
    );
  }

  if (data.events.length === 0) {
    return (
      <Reveal>
        <div className="rounded-sm border border-line p-10 text-center md:p-16">
          <p className="h-display text-2xl md:text-3xl">New nights announced soon.</p>
          <p className="mt-3 text-sm text-muted">
            Follow us on Instagram or join the newsletter below to hear first.
          </p>
        </div>
      </Reveal>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {data.events.map((e, i) => (
        <FxReveal key={e._id} effect="tilt" delay={(i % 3) * 0.08}>
          <RizztixEventCard event={e} />
        </FxReveal>
      ))}
    </div>
  );
}
