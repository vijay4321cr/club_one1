import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import FxReveal from "@/components/ui/FxReveal";
import Button from "@/components/ui/Button";
import Poster from "@/components/ui/Poster";

export const metadata: Metadata = { title: "Our Services" };

const services = [
  {
    n: "01",
    title: "Club Nights & Ticketing",
    hue: 358,
    image: "/gallery/stage-lasers.jpg",
    body: "Headline DJs, themed takeovers and resident-led weekends, every Wednesday to Sunday. Tickets are sold online with tiered pricing — early bird, general, couple and skip-the-line — delivered straight to your account with door-ready QR entry.",
  },
  {
    n: "02",
    title: "Private Events & Celebrations",
    hue: 280,
    image: "/gallery/party-sparklers.jpg",
    body: "Birthdays, launches and after-parties with booth décor, custom cakes, dedicated photographers and curated music. Take a booth or buy out the terrace — our events team builds the night around you.",
  },
  {
    n: "03",
    title: "Corporate & Brand Nights",
    hue: 42,
    image: "/gallery/bar-counter.jpg",
    body: "Full and partial venue buyouts for corporate mixers, brand activations and media nights, with in-house sound, lighting, LED screens and hospitality staffing handled end to end.",
  },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
      <Reveal>
        <p className="label mb-3">Our services</p>
        <h1 className="h-display !normal-case max-w-3xl text-4xl sm:text-5xl md:text-7xl">
          Everything the night needs
          <span className="text-primary">.</span>
        </h1>
      </Reveal>

      <div className="mt-14 space-y-0 md:mt-20">
        {services.map((s, i) => (
          <Reveal key={s.n}>
            <div
              className={`grid gap-6 border-t border-line py-10 md:grid-cols-2 md:items-center md:gap-12 md:py-16 ${
                i === services.length - 1 ? "border-b" : ""
              }`}
            >
              <div className={i % 2 ? "md:order-2" : ""}>
                <p className="label mb-3 !text-primary">{s.n}</p>
                <h2 className="h-display text-3xl md:text-4xl">{s.title}</h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted md:text-base">
                  {s.body}
                </p>
              </div>
              <FxReveal
                effect="burn"
                className={`overflow-hidden rounded-sm ${i % 2 ? "md:order-1" : ""}`}
              >
                <Poster
                  hue={s.hue}
                  initials={s.n}
                  src={s.image}
                  alt={s.title}
                  className="aspect-[16/9] w-full rounded-sm"
                />
              </FxReveal>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-16 text-center md:mt-24">
        <p className="font-serif text-2xl italic text-cream/85 md:text-3xl">
          planning something? let&apos;s talk.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/contact">Contact us</Button>
          <Button href="/#events" variant="outline">
            See events
          </Button>
        </div>
      </Reveal>
    </div>
  );
}
