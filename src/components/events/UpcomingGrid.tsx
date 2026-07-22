"use client";

import { useMemo, useState, type ReactNode } from "react";
import RizztixEventCard from "@/components/events/RizztixEventCard";
import FxReveal from "@/components/ui/FxReveal";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { useUpcomingEvents } from "@/lib/useUpcoming";

interface Props {
  /** when provided, the grid renders its own heading with the search on that row */
  label?: string;
  title?: ReactNode;
}

/** Live events grid: skeleton, empty state, and search (when >3 events). */
export default function UpcomingGrid({ label, title }: Props) {
  const data = useUpcomingEvents();
  const [query, setQuery] = useState("");
  const hasHeading = !!(label || title);
  const showSearch = !!data && data.events.length > 3;

  const searchField = (className = "") => (
    <div className={`flex items-center gap-3 border-b border-line focus-within:border-primary ${className}`}>
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 stroke-muted" fill="none" strokeWidth="2" aria-hidden>
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 4 4" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search events, artists, genres…"
        aria-label="Search events"
        className="w-full bg-transparent py-2.5 text-sm text-cream placeholder:text-muted/60 focus:outline-none"
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
  );

  const heading = hasHeading ? (
    <SectionHeading
      label={label ?? ""}
      title={title}
      right={showSearch ? searchField("w-64 lg:w-72") : undefined}
    />
  ) : null;

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
      <div>
        {heading}
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/5] w-full rounded-sm bg-surface" />
              <div className="mt-4 h-5 w-3/4 rounded-sm bg-surface" />
              <div className="mt-2 h-4 w-1/2 rounded-sm bg-surface" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.events.length === 0) {
    return (
      <div>
        {heading}
        <Reveal>
          <div className="rounded-sm border border-line p-10 text-center md:p-16">
            <p className="h-display text-2xl md:text-3xl">New nights announced soon.</p>
            <p className="mt-3 text-sm text-muted">
              Follow us on Instagram or join the newsletter below to hear first.
            </p>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div>
      {heading}

      {/* search — on the heading row (desktop) when a heading is shown;
          otherwise/mobile it sits above the grid */}
      {showSearch && (
        <div className={hasHeading ? "mb-8 md:hidden" : "mb-10"}>
          {searchField("max-w-md")}
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
