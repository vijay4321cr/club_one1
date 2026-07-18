import Marquee from "@/components/ui/Marquee";
import Reveal from "@/components/ui/Reveal";
import { partners } from "@/lib/data/content";

export default function PartnersMarquee() {
  return (
    <section className="py-14 md:py-20">
      <Reveal>
        <p className="label mb-6 text-center">In good company — partners & collabs</p>
      </Reveal>
      <Reveal>
        <Marquee>
          {partners.map((p) => (
            <span
              key={p.id}
              className="mx-8 font-display text-lg font-medium uppercase tracking-wide text-muted transition-colors hover:text-cream md:mx-12 md:text-xl"
            >
              {p.name}
            </span>
          ))}
        </Marquee>
      </Reveal>
    </section>
  );
}
