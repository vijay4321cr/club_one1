import type { Metadata } from "next";
import TicketLookup from "@/components/account/TicketLookup";

export const metadata: Metadata = { title: "Your Ticket" };

/**
 * SMS short ticket link (DLT): /t/?{bookingRef}  (bare ref after "?")
 * Also supports /t/{bookingRef} via .htaccess rewrite and /t/?ref={bookingRef}.
 */
export default function TicketShortLinkPage() {
  return <TicketLookup />;
}
