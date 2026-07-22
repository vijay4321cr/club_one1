import Reveal from "@/components/ui/Reveal";
import { club } from "@/lib/data/content";

export default function SocialStrip() {
  return (
    <section className="border-y border-line">
      <div className="mx-auto max-w-7xl px-5 py-12 text-center md:px-8 md:py-16">
        <Reveal>
          <p className="label mb-4">Follow the night</p>
          <h2 className="h-display text-3xl md:text-5xl">
            Every set. Every drop.{" "}
            <span className="font-serif normal-case italic tracking-normal text-primary">live.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-10">
            {club.socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Follow 2BHK on ${s.name}`}
                className="group flex flex-col items-center gap-3"
              >
                <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface/60 transition-all duration-500 group-hover:-translate-y-1 group-hover:border-primary group-hover:shadow-[0_0_28px_-4px_var(--color-primary)]">
                  {/* pulsing halo on hover */}
                  <span className="absolute inset-0 rounded-2xl bg-primary/30 opacity-0 transition-opacity duration-500 group-hover:animate-ping group-hover:opacity-100" />
                  {/* Instagram glyph */}
                  <svg
                    viewBox="0 0 24 24"
                    className="relative h-7 w-7 text-cream transition-colors duration-500 group-hover:text-primary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <span className="label !text-cream/70 transition-colors group-hover:!text-primary">
                  Follow on {s.name}
                </span>
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
