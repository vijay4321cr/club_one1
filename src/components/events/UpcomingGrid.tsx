"use client";

import { useMemo, useState } from "react";
import RizztixEventCard from "@/components/events/RizztixEventCard";
import FxReveal from "@/components/ui/FxReveal";
import Reveal from "@/components/ui/Reveal";
import { useUpcomingEvents } from "@/lib/useUpcoming";

/** Live events grid: skeleton, empty state, and search (when >3 events). */
export default function UpcomingGrid() {
  const data = useUpcomingEvents();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.events;
    return data.events.filter((e) => {
      const haystack = [
        e.title,
        e.genre?.map((g) => g.title).join(" ") ?? "",
        e.artistsDetails?.map((a) => a.name).join(" ") ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, query]);

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
    <div>
      {/* search — only worth showing once the calendar fills up */}
      {data.events.length > 3 && (
        <div className="mb-10 flex max-w-md items-center gap-3 border-b border-line focus-within:border-primary">
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4 shrink-0 stroke-muted"
            fill="none"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, artists, genres…"
            aria-label="Search events"
            className="w-full bg-transparent py-3 text-sm text-cream placeholder:text-muted/60 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="label shrink-0 !text-muted transition-colors hover:!text-cream"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-sm border border-line p-10 text-center">
          <p className="h-display text-2xl">Nothing matches &ldquo;{query}&rdquo;.</p>
          <p className="mt-3 text-sm text-muted">Try an artist name, genre or event title.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e, i) => (
            <FxReveal key={`${e._id}-${query ? "s" : "a"}`} effect="tilt" delay={(i % 3) * 0.08}>
              <RizztixEventCard event={e} />
            </FxReveal>
          ))}
        </div>
      )}
    </div>
  );
}
