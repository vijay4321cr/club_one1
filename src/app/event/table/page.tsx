import { Suspense } from "react";
import type { Metadata } from "next";
import TableBooking from "@/components/table/TableBooking";

export const metadata: Metadata = { title: "Book a Table" };

/** Event table booking: /event/table?event={eventId} */
export default function TableBookingPage() {
  return (
    <Suspense fallback={null}>
      <TableBooking />
    </Suspense>
  );
}
