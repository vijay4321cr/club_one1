import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Cancellation & Refund Policy" };

export default function RefundsPage() {
  return (
    <LegalPage
      label="Legal"
      title="Cancellation & Refund Policy"
      updated="15 July 2026"
      sections={[
        {
          heading: "1. Tickets",
          body: [
            "Tickets once booked cannot be exchanged or refunded. Please review your selection, event date and total amount (including any internet handling fee) carefully before completing payment.",
          ],
        },
        {
          heading: "2. Event changes & cancellations by us",
          body: [
            "If an event is cancelled by the organizer, all tickets for that event are refunded in full to the original payment method within 5–7 business days.",
            "If an event is rescheduled, bookings carry over to the new date. Lineup changes do not by themselves qualify for refunds.",
          ],
        },
        {
          heading: "3. Denied entry",
          body: [
            "Entry refused at the door for reasons within our published Terms & Conditions — including failure to present a valid ID, intoxication, or dress-code violations — does not qualify for a refund.",
          ],
        },
        {
          heading: "4. Questions",
          body: [
            "For any booking or refund query, contact us with your booking ID via the contact page or the details in the footer. This policy is issued by Myrah Hospitality LLP, Maharashtra, trading as 2BHK — Bar ‹Hauté› Kitchen.",
          ],
        },
      ]}
    />
  );
}
