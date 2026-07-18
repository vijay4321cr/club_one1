"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Effect = "rise" | "burn" | "wipe" | "tilt";

interface Props {
  children: ReactNode;
  className?: string;
  /**
   * rise — fade + translate up (default)
   * burn — hot flash: over-bright ember overlay that burns away
   * wipe — clip-path sweep from the left
   * tilt — rises with a slight rotation that settles
   */
  effect?: Effect;
  delay?: number;
}

/** Scroll-triggered section transitions in the site's motion language. */
export default function FxReveal({ children, className = "", effect = "rise", delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const overlay = el.querySelector<HTMLElement>(":scope > .fx-burn");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el, { autoAlpha: 1, clipPath: "none" });
      if (overlay) gsap.set(overlay, { opacity: 0 });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const scrollTrigger = { trigger: el, start: "top 86%", once: true };
      switch (effect) {
        case "burn": {
          const tl = gsap.timeline({ scrollTrigger, delay });
          tl.fromTo(
            el,
            {
              autoAlpha: 0,
              scale: 1.05,
              filter: "brightness(2.4) saturate(1.9) contrast(1.15)",
            },
            {
              autoAlpha: 1,
              scale: 1,
              filter: "brightness(1) saturate(1) contrast(1)",
              duration: 1,
              ease: "power2.out",
            }
          );
          if (overlay) {
            tl.fromTo(
              overlay,
              { opacity: 0.95, yPercent: 8 },
              { opacity: 0, yPercent: -6, duration: 0.9, ease: "power2.out" },
              0.08
            );
          }
          break;
        }
        case "wipe":
          gsap.fromTo(
            el,
            { clipPath: "inset(0 100% 0 0)", autoAlpha: 1 },
            {
              clipPath: "inset(0 0% 0 0)",
              duration: 1.1,
              delay,
              ease: "power3.inOut",
              scrollTrigger,
            }
          );
          break;
        case "tilt":
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 64, rotate: 2.5, transformOrigin: "left bottom" },
            {
              autoAlpha: 1,
              y: 0,
              rotate: 0,
              duration: 0.9,
              delay,
              ease: "power3.out",
              scrollTrigger,
            }
          );
          break;
        default:
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 40 },
            { autoAlpha: 1, y: 0, duration: 0.9, delay, ease: "power3.out", scrollTrigger }
          );
      }
    }, el);
    return () => ctx.revert();
  }, [effect, delay]);

  return (
    <div ref={ref} className={`relative ${className}`} style={{ visibility: "hidden" }}>
      {children}
      {effect === "burn" && (
        <span
          aria-hidden
          className="fx-burn pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "radial-gradient(120% 95% at 50% 110%, rgba(255,122,24,0.9) 0%, rgba(225,6,0,0.6) 40%, rgba(13,13,13,0.05) 78%)",
            mixBlendMode: "screen",
            opacity: 0,
          }}
        />
      )}
    </div>
  );
}
