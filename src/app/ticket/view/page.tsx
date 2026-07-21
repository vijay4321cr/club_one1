import { Suspense } from "react";
import type { Metadata } from "next";
import GuestTicketView from "@/components/account/GuestTicketView";

export const metadata: Metadata = { title: "Your Ticket" };

/** Login-free ticket page: /ticket/view?id={orderId}&token={guestToken} */
export default function TicketViewPage() {
  return (
    <Suspense fallback={null}>
      <GuestTicketView />
    </Suspense>
  );
}
