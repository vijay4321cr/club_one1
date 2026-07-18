import type { Metadata } from "next";
import UpcomingGrid from "@/components/events/UpcomingGrid";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Events" };

/** All live + upcoming events straight from the box office. */
export default function EventsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
      <Reveal>
        <div className="border-b border-line pb-6">
          <p className="label mb-3">Box office</p>
          <h1 className="h-display text-4xl sm:text-5xl md:text-7xl">
            All
            <br />
            Events
          </h1>
        </div>
      </Reveal>

      <div className="mt-10 md:mt-14">
        <UpcomingGrid />
      </div>
    </div>
  );
}
