import Reveal from "@/components/ui/Reveal";
import { club } from "@/lib/data/content";

const IG_GRADIENT =
  "linear-gradient(45deg,#feda75 0%,#fa7e1e 25%,#d62976 50%,#962fbf 75%,#4f5bd5 100%)";

export default function SocialStrip() {
  const ig = club.socials.find((s) => s.name === "Instagram") ?? club.socials[0];
  const handle = ig?.href.replace(/\/+$/, "").split("/").pop() ?? "2bhkdinerkeyclub";

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
          <div className="mt-9 flex justify-center">
            {/* gradient-ring Instagram follow pill */}
            <a
              href={ig?.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Follow 2BHK on Instagram — @${handle}`}
              className="group relative inline-flex rounded-full p-[2px] transition-transform duration-300 hover:-translate-y-0.5 active:scale-95"
              style={{ backgroundImage: IG_GRADIENT }}
            >
              {/* soft glow */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-70"
                style={{ backgroundImage: IG_GRADIENT }}
              />
              <span className="relative flex items-center gap-3 rounded-full bg-coal px-5 py-3 transition-colors duration-500 group-hover:bg-transparent">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-cream" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none" />
                </svg>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.2em] text-cream/70 transition-colors group-hover:text-cream">
                    Follow us on Instagram
                  </span>
                  <span className="font-display text-base font-semibold text-cream">@{handle}</span>
                </span>
                <span className="ml-1 rounded-full bg-cream px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-coal transition-colors group-hover:bg-primary group-hover:text-cream">
                  Follow
                </span>
              </span>
            </a>
          </div>
          <p className="mt-4 text-xs text-muted">Tag us <span className="text-cream">#2BHKnights</span> — get featured on the wall</p>
        </Reveal>
      </div>
    </section>
  );
}
