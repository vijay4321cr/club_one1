"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RizztixArtist } from "@/types";

interface Props {
  artist: RizztixArtist;
  index: number;
}

/**
 * Lineup avatar: an outer ring draws itself on first view (story-ring style),
 * then the photo fades in. Links to the artist's Instagram when available.
 */
export default function ArtistBadge({ artist, index }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const gradId = `artist-ring-${artist._id}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ring = el.querySelector<SVGCircleElement>(".artist-ring");
    const img = el.querySelector<HTMLElement>(".artist-img");
    const meta = el.querySelector<HTMLElement>(".artist-meta");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set([ring, img, meta], { clearProps: "all", autoAlpha: 1, strokeDashoffset: 0 });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
        delay: index * 0.12,
      });
      // 1. draw the ring
      tl.fromTo(
        ring,
        { strokeDashoffset: 100 },
        { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }
      );
      // 2. photo fades + scales in
      tl.fromTo(
        img,
        { autoAlpha: 0, scale: 0.75 },
        { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(1.6)" },
        "-=0.35"
      );
      // 3. name slips up
      tl.fromTo(
        meta,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
        "-=0.25"
      );
    }, el);
    return () => ctx.revert();
  }, [index]);

  const content = (
    <div ref={ref} className="w-28 shrink-0 snap-start text-center md:w-32">
      <div className="relative mx-auto aspect-square w-full transition-transform duration-300 group-hover:scale-105">
        {/* self-drawing ring */}
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e10600" />
              <stop offset="100%" stopColor="#c9a227" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(245,245,240,0.1)" strokeWidth="1.5" />
          <circle
            className="artist-ring"
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100}
          />
        </svg>
        {/* photo */}
        <div
          className="artist-img absolute inset-[7px] overflow-hidden rounded-full bg-surface"
          style={{ visibility: "hidden" }}
        >
          {artist.image && (
            <Image src={artist.image} alt={artist.name} fill sizes="128px" className="object-cover" />
          )}
        </div>
      </div>
      <div className="artist-meta mt-3" style={{ visibility: "hidden" }}>
        <p className="font-display text-sm font-medium uppercase leading-tight">{artist.name}</p>
        {artist.instagramurl && (
          <p className="label mt-1 !text-[0.5625rem] !text-muted transition-colors group-hover:!text-primary">
            Instagram ↗
          </p>
        )}
      </div>
    </div>
  );

  return artist.instagramurl ? (
    <a
      href={artist.instagramurl}
      target="_blank"
      rel="noreferrer"
      aria-label={`${artist.name} on Instagram`}
      className="group block"
    >
      {content}
    </a>
  ) : (
    content
  );
}
