"use client";

import Hero from "@/components/hero/Hero";
import { useUpcomingEvents } from "@/lib/useUpcoming";

/** Hero fed with the live next event (client-fetched for static export). */
export default function HeroLive() {
  const data = useUpcomingEvents();
  return <Hero nextEvent={data?.events[0]} />;
}
