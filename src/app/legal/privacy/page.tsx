import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      label="Legal"
      title="Privacy Policy"
      updated="15 July 2026"
      sections={[
        {
          heading: "1. Data collection",
          body: [
            "We collect personal information such as your name, address, email and phone number, along with identification details verified at entry and usage/attendance logs from your bookings and visits.",
            "Our website additionally uses cookies and similar technologies for essential functionality (login sessions, age verification) and, with your consent, analytics.",
          ],
        },
        {
          heading: "2. Purpose",
          body: [
            "Your data is used for managing membership and bookings, communication (confirmations, changes and cancellations), personalized services on the night, and — where you have opted in — marketing about events and offers.",
          ],
        },
        {
          heading: "3. Sharing & disclosure",
          body: [
            "Personal data is not sold. It may be shared with partners essential to operations (payment gateways, communication and analytics providers) or disclosed where required to comply with legal obligations.",
          ],
        },
        {
          heading: "4. Security",
          body: [
            "Protection measures include secure servers, limited staff access to personal data, and physical security at the venue including CCTV.",
            "Payment details are processed by our payment gateway partners and are never stored on our servers.",
          ],
        },
        {
          heading: "5. Your rights & contact",
          body: [
            "You may access, correct or delete your personal data, or withdraw marketing consent at any time by writing to us from your registered email.",
            "This policy is issued by Myrah Hospitality LLP, Maharashtra, trading as 2BHK — Bar ‹Hauté› Kitchen. For any privacy question or complaint, reach us via the contact page or the details in the footer.",
          ],
        },
      ]}
    />
  );
}
