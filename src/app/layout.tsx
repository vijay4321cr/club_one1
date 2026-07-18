import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/components/layout/LenisProvider";
import PageTransition from "@/components/layout/PageTransition";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AgeGate from "@/components/overlays/AgeGate";
import CookieBanner from "@/components/overlays/CookieBanner";

const clash = localFont({
  src: "../fonts/ClashDisplay-Variable.woff2",
  variable: "--font-clash",
  weight: "200 700",
  display: "swap",
});

const general = localFont({
  src: [
    {
      path: "../fonts/GeneralSans-Variable.woff2",
      weight: "200 700",
      style: "normal",
    },
    {
      path: "../fonts/GeneralSans-VariableItalic.woff2",
      weight: "200 700",
      style: "italic",
    },
  ],
  variable: "--font-general",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  // set NEXT_PUBLIC_SITE_URL at build time to the final live domain
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://2bhkdinerkeyclub.in"),
  title: {
    default: "2BHK Diner & Key Club — Pune | Events, Tickets & Nightlife",
    template: "%s — 2BHK Diner & Key Club",
  },
  description:
    "2BHK Diner & Key Club — all-day diner and high-energy key club at Raja Bahadur Mills, behind Sheraton Grand, Bund Garden Road, Pune. Drink. Dine. Dance. Dazzle. Book event tickets online.",
  keywords: [
    "2BHK",
    "2BHK Diner & Key Club",
    "nightclub Pune",
    "club Pune",
    "Bund Garden Road",
    "Pune nightlife",
    "event tickets Pune",
  ],
  openGraph: {
    title: "2BHK Diner & Key Club — Pune",
    description:
      "Drink. Dine. Dance. Dazzle. The city's home of nightlife at Raja Bahadur Mills, Pune. Book event tickets online.",
    type: "website",
    locale: "en_IN",
    siteName: "2BHK Diner & Key Club",
    images: [{ url: "/logo.png", width: 675, height: 844, alt: "2BHK — Bar Hauté Kitchen" }],
  },
  twitter: {
    card: "summary",
    title: "2BHK Diner & Key Club — Pune",
    description:
      "Drink. Dine. Dance. Dazzle. Book event tickets online at Pune's home of nightlife.",
    images: ["/logo.png"],
  },
};

/* Google rich-results / Maps association */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "NightClub",
  name: "2BHK Diner & Key Club",
  alternateName: "2BHK — Bar Hauté Kitchen",
  image: "/logo.png",
  telephone: "+917745042999",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Unit 7, Raja Bahadur Mills, behind Sheraton Grand, Bund Garden Road, Sangamvadi",
    addressLocality: "Pune",
    addressRegion: "Maharashtra",
    postalCode: "411001",
    addressCountry: "IN",
  },
  geo: { "@type": "GeoCoordinates", latitude: 18.5325927, longitude: 73.8709205 },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "12:30",
      closes: "01:30",
    },
  ],
  sameAs: ["https://www.instagram.com/2bhkdinerkeyclub/"],
  priceRange: "₹₹₹",
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${clash.variable} ${general.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-coal text-cream">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <LenisProvider>
          <PageTransition>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </PageTransition>
        </LenisProvider>
        <AgeGate />
        <CookieBanner />
      </body>
    </html>
  );
}
