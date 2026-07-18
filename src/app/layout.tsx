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
import { getRizztixUpcomingEvents } from "@/lib/api";

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
  title: {
    default: "2BHK — Bar ‹Hauté› Kitchen | Events & Tickets",
    template: "%s — 2BHK",
  },
  description:
    "2BHK — Bar ‹Hauté› Kitchen, Pune. Drink. Dine. Dance. Dazzle. Buy event tickets and catch the biggest club nights in the city.",
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // next real event for the menu teaser (fetch is deduped with the page's)
  const { events: upcomingEvents } = await getRizztixUpcomingEvents();
  return (
    <html
      lang="en"
      className={`${clash.variable} ${general.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-coal text-cream">
        <LenisProvider>
          <PageTransition>
            <Header nextEvent={upcomingEvents[0]} />
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
