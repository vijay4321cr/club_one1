import type { ClubEvent } from "@/types";
import FxReveal from "@/components/ui/FxReveal";
import SectionHeading from "@/components/ui/SectionHeading";
import Marquee from "@/components/ui/Marquee";
import Ring3D, { type RingItem } from "@/components/sections/Ring3D";
import { artists } from "@/lib/data/content";

export default function PastEvents({ events }: { events: ClubEvent[] }) {
  const ringItems: RingItem[] = events.map((e) => ({
    id: e.slug,
    image: e.poster.image,
    caption: e.title,
    hue: e.poster.hue,
  }));

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <SectionHeading label="The Nights So Far" title={<>Past<br />Highlights</>} />

      {/* 3D spinning ring of past-event posters (drag to spin) */}
      <Ring3D items={ringItems} />

      {/* artists who performed — wipes in from the left */}
      <FxReveal effect="wipe" className="mt-10 md:mt-12">
        <p className="label mb-5">Artists Who Performed</p>
      </FxReveal>
      <FxReveal effect="wipe" delay={0.15}>
        <Marquee className="border-y border-line py-5">
          {artists.map((a) => (
            <span key={a.id} className="flex items-center">
              <span className="h-display px-6 text-2xl text-cream/80 md:text-4xl">{a.name}</span>
              <span className="text-primary">✦</span>
            </span>
          ))}
        </Marquee>
      </FxReveal>
    </section>
  );
}
