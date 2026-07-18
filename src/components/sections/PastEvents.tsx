import type { ClubEvent } from "@/types";
import Poster from "@/components/ui/Poster";
import FxReveal from "@/components/ui/FxReveal";
import SectionHeading from "@/components/ui/SectionHeading";
import Marquee from "@/components/ui/Marquee";
import { artists } from "@/lib/data/content";
import { eventDate } from "@/lib/format";

export default function PastEvents({ events }: { events: ClubEvent[] }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <SectionHeading label="The nights so far" title={<>Past<br />Highlights</>} />

      {/* horizontal snap strip on mobile, grid on desktop */}
      <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
        {events.map((e, i) => (
          <FxReveal
            key={e.slug}
            effect="tilt"
            delay={(i % 4) * 0.08}
            className="w-64 shrink-0 snap-start md:w-auto"
          >
            <div className="group">
              <div className="overflow-hidden rounded-sm">
                <Poster
                  hue={e.poster.hue}
                  initials={e.poster.initials}
                  src={e.poster.image}
                  alt={`${e.title} poster`}
                  priority={i < 4}
                  className="aspect-[3/4] w-full transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </div>
              <p className="label mt-3 !text-[0.5625rem]">{eventDate(e.date)}</p>
              <h3 className="mt-1 font-display text-lg font-medium uppercase leading-tight">
                {e.title}
              </h3>
              <p className="mt-1 text-sm text-muted">{e.lineup.join(" · ")}</p>
            </div>
          </FxReveal>
        ))}
      </div>

      {/* artists who performed — wipes in from the left */}
      <FxReveal effect="wipe" className="mt-16 md:mt-20">
        <p className="label mb-5">Artists who performed</p>
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
