"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Button from "@/components/ui/Button";
import Countdown from "@/components/hero/Countdown";
import type { RizztixEvent } from "@/types";

export default function Hero({ nextEvent }: { nextEvent?: RizztixEvent }) {
  const rootRef = useRef<HTMLElement>(null);
  const [showVideo, setShowVideo] = useState(false);

  // autoplay the background video only on motion-friendly devices
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShowVideo(true);
    }
  }, []);

  // intro timeline: logo reveal → tagline → CTAs
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // register here too — this effect can run before LenisProvider's
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        ".hero-logo-line",
        { yPercent: 110 },
        { yPercent: 0, duration: 1.1, stagger: 0.12, delay: 0.2 }
      )
        .fromTo(".hero-fade", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, "-=0.5")
        .fromTo(".hero-scroll-hint", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, "-=0.3");

      // subtle parallax drift on scroll — no opacity fade, content stays crisp
      gsap.to(".hero-content", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative flex min-h-svh flex-col justify-end overflow-hidden"
    >
      {/* backdrop: gradient base, looping club video above it (object-cover
          keeps the centered DJ framing on both mobile 9:16 and desktop 16:9) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 70% 20%, rgba(225,6,0,0.18) 0%, rgba(13,13,13,0) 55%), #0d0d0d",
        }}
      />
      {showVideo && (
        <video
          aria-hidden
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          src="/videos/hero.mp4"
        />
      )}
      {/* legibility scrim + grain over the video */}
      <div aria-hidden className="noise absolute inset-0 bg-coal/50" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-coal to-transparent"
      />

      <div className="hero-content relative mx-auto w-full max-w-7xl px-5 pb-14 pt-32 md:px-8 md:pb-20">
        <p className="hero-fade label mb-4 !text-cream/70" style={{ visibility: "hidden" }}>
          Drink. Dine. Dance. Dazzle.
        </p>

        {/* real logo artwork replaces the text wordmark (h1 kept for SEO/a11y) */}
        <h1 className="sr-only">2BHK — Bar Hauté Kitchen</h1>
        <div className="overflow-hidden">
          <div className="hero-logo-line">
            <Image
              src="/logo.png"
              alt=""
              width={675}
              height={844}
              priority
              className="h-auto w-48 drop-shadow-[0_8px_32px_rgba(0,0,0,0.55)] sm:w-60 md:w-80 lg:w-[22rem]"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-8 md:mt-14 md:flex-row md:items-end md:justify-between">
          {nextEvent &&
            (nextEvent.isLive ? (
              <div className="hero-fade" style={{ visibility: "hidden" }}>
                <p className="label mb-3">Happening now</p>
                <p className="flex items-center gap-3 font-display text-2xl font-medium uppercase md:text-4xl">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
                  {nextEvent.title}
                </p>
              </div>
            ) : (
              <div className="hero-fade" style={{ visibility: "hidden" }}>
                <Countdown to={nextEvent.startdatetime} label={`Next — ${nextEvent.title}`} />
              </div>
            ))}
          <div className="hero-fade flex flex-col gap-3 sm:flex-row" style={{ visibility: "hidden" }}>
            <Button
              href={nextEvent ? `/event/view?id=${nextEvent._id}` : "/event"}
              variant="primary"
            >
              Buy Tickets
            </Button>
            <Button href="/event" variant="outline">
              All Events
            </Button>
          </div>
        </div>
      </div>

      <div
        className="hero-scroll-hint pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 md:bottom-8"
        style={{ visibility: "hidden" }}
      >
        <span className="label animate-bounce !text-cream/50">Scroll ↓</span>
      </div>
    </section>
  );
}
