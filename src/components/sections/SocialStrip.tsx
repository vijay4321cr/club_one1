import Reveal from "@/components/ui/Reveal";
import { club } from "@/lib/data/content";

export default function SocialStrip() {
  return (
    <section className="border-y border-line">
      <div className="mx-auto max-w-7xl px-5 py-16 text-center md:px-8 md:py-24">
        <Reveal>
          <p className="label mb-4">Follow the night</p>
          <h2 className="h-display text-3xl md:text-5xl">
            Every set. Every drop.{" "}
            <span className="font-serif normal-case italic tracking-normal text-primary">live.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {club.socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="font-display text-lg font-medium uppercase tracking-wide text-cream/80 transition-colors hover:text-primary md:text-xl"
              >
                {s.name}
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
