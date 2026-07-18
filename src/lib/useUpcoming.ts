"use client";

import { useEffect, useState } from "react";
import { getRizztixUpcomingEvents, type UpcomingEventsResult } from "@/lib/api";

// one shared in-flight promise so hero, menu, grids etc. trigger a single
// API request per page load
let cachePromise: Promise<UpcomingEventsResult> | null = null;

/** Client-side upcoming events. `null` while loading. */
export function useUpcomingEvents(): UpcomingEventsResult | null {
  const [data, setData] = useState<UpcomingEventsResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    cachePromise ??= getRizztixUpcomingEvents();
    cachePromise.then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
