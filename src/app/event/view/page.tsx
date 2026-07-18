import { Suspense } from "react";
import type { Metadata } from "next";
import EventDetail from "@/components/events/EventDetail";

export const metadata: Metadata = { title: "Event" };

/** Static-export-friendly event detail: /event/view?id={eventId} */
export default function EventViewPage() {
  return (
    <Suspense fallback={null}>
      <EventDetail />
    </Suspense>
  );
}
