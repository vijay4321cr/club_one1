import Reveal from "@/components/ui/Reveal";

export interface LegalSection {
  heading: string;
  body: string[];
}

interface Props {
  label: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}

export default function LegalPage({ label, title, updated, sections }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 md:pt-36">
      <Reveal>
        <p className="label mb-3">{label}</p>
        <h1 className="h-display !normal-case text-4xl md:text-5xl">{title}</h1>
        <p className="mt-4 font-serif italic text-muted">Last updated — {updated}</p>
      </Reveal>
      <div className="mt-12 space-y-10">
        {sections.map((s, i) => (
          <Reveal key={s.heading} delay={Math.min(i * 0.04, 0.2)}>
            <section className="border-t border-line pt-8">
              <h2 className="font-display text-lg font-medium uppercase md:text-xl">
                {s.heading}
              </h2>
              {s.body.map((p, j) => (
                <p key={j} className="mt-3 text-sm leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </section>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
