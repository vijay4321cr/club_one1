import type { Metadata } from "next";
import RizztixEventCard from "@/components/events/RizztixEventCard";
import FxReveal from "@/components/ui/FxReveal";
import Reveal from "@/components/ui/Reveal";
import { getRizztixUpcomingEvents } from "@/lib/api";

export const revalidate = 60;
export const metadata: Metadata = { title: "Events" };

/** All live + upcoming events straight from the box office. */
export default async function EventsPage() {
  const { events, totalCount } = await getRizztixUpcomingEvents();

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
      <Reveal>
        <div className="flex items-end justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="label mb-3">Box office</p>
            <h1 className="h-display text-4xl sm:text-5xl md:text-7xl">
              All
              <br />
              Events
            </h1>
          </div>
          {events.length > 0 && (
            <span className="hidden shrink-0 font-serif text-xl italic text-muted md:block">
              {totalCount} on sale now
            </span>
          )}
        </div>
      </Reveal>

      {events.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
          {events.map((e, i) => (
            <FxReveal key={e._id} effect="tilt" delay={(i % 3) * 0.08}>
              <RizztixEventCard event={e} />
            </FxReveal>
          ))}
        </div>
      ) : (
        <Reveal className="mt-10">
          <div className="rounded-sm border border-line p-10 text-center md:p-16">
            <p className="h-display text-2xl md:text-3xl">New nights announced soon.</p>
            <p className="mt-3 text-sm text-muted">
              Follow us on Instagram or join the newsletter to hear first.
            </p>
          </div>
        </Reveal>
      )}
    </div>
  );
}
