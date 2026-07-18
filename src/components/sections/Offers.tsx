import FxReveal from "@/components/ui/FxReveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { offers } from "@/lib/data/content";

export default function Offers() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <SectionHeading label="Worth showing up early for" title="Offers" />
      <div className="grid gap-px overflow-hidden rounded-sm bg-line md:grid-cols-2">
        {offers.map((o, i) => (
          <FxReveal key={o.id} effect="tilt" delay={(i % 2) * 0.12}>
            <div className="group flex h-full flex-col justify-between gap-8 bg-coal p-6 transition-colors duration-500 hover:bg-surface md:p-10">
              <div className="flex items-start justify-between gap-4">
                <span className="label rounded-full border border-line px-3 py-1 !text-[0.5625rem]">
                  {o.tag}
                </span>
                <span className="h-display text-2xl text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  →
                </span>
              </div>
              <div>
                <h3 className="h-display text-2xl md:text-3xl">{o.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{o.detail}</p>
              </div>
            </div>
          </FxReveal>
        ))}
      </div>
    </section>
  );
}
