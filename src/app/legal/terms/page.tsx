import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <LegalPage
      label="Legal"
      title="Terms & Conditions"
      updated="15 July 2026"
      sections={[
        {
          heading: "1. Tickets & bookings",
          body: [
            "Tickets once booked cannot be exchanged or refunded, and Club Rules are applicable at all times.",
            "An internet handling fee per ticket may be levied. Please check the total amount before completing payment.",
            "Unlawful resale (or attempted unlawful resale) of a ticket will lead to seizure or cancellation of that ticket without refund or other compensation.",
          ],
        },
        {
          heading: "2. Entry",
          body: [
            "We recommend that you arrive at least 30 minutes prior at the venue for a seamless entry.",
            "Entry is restricted to guests of legal drinking age with a valid government-issued photo ID. Management reserves the right of admission.",
          ],
        },
        {
          heading: "3. Parking",
          body: [
            "Parking near or at the venue premises is at the risk of the vehicle owner. The organizer will not hold responsibility for any damage or theft of any vehicle within the stipulated premises.",
          ],
        },
        {
          heading: "4. Conduct inside the venue",
          body: [
            "Illegal substances, outside food or beverages, and weapons of any kind are strictly prohibited. Guests and their belongings may be subject to security checks.",
            "The venue operates CCTV for guest safety. Professional photography and videography occur at events; entry constitutes consent to appear in such media used for the club's promotion.",
          ],
        },
        {
          heading: "5. Company & governing law",
          body: [
            "This website and venue are operated by Myrah Hospitality LLP, Maharashtra (GSTIN 27ABKFM0665L1ZU), trading as 2BHK — Bar ‹Hauté› Kitchen.",
            "These terms are governed by the laws of India. Any disputes are subject to the exclusive jurisdiction of the courts of Pune, Maharashtra.",
          ],
        },
      ]}
    />
  );
}
