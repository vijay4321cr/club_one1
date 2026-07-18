"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import TransitionLink from "@/components/ui/TransitionLink";
import { club } from "@/lib/data/content";
import { eventDate } from "@/lib/format";
import type { RizztixEvent } from "@/types";

const links = [
  { n: "01", label: "Home", href: "/" },
  { n: "02", label: "Events", href: "/event" },
  { n: "03", label: "Our Services", href: "/services" },
  { n: "04", label: "Contact Us", href: "/contact" },
  { n: "05", label: "My Account", href: "/account" },
];

const legal = [
  { label: "Cancellation & Refunds", href: "/legal/refunds" },
  { label: "Terms & Conditions", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** real next event from the Rizztix API, passed down from the layout */
  nextEvent?: RizztixEvent;
}

/** Fullscreen overlay nav — clip-path curtain + staggered oversized links. */
export default function FullscreenMenu({ open, onClose, nextEvent }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (open) {
      setRendered(true);
      document.body.style.overflow = "hidden";
      return;
    }
    document.body.style.overflow = "";
    if (root && rendered) {
      gsap.to(root, {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.55,
        ease: "power3.inOut",
        onComplete: () => setRendered(false),
      });
    }
    return () => {
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!rendered || !open) return;
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        root,
        { clipPath: "inset(0 0 100% 0)" },
        { clipPath: "inset(0 0 0% 0)", duration: 0.65, ease: "power4.inOut" }
      );
      gsap.fromTo(
        ".menu-link",
        { yPercent: 120, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.07,
          delay: 0.3,
          ease: "power3.out",
        }
      );
      gsap.fromTo(
        ".menu-meta",
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, delay: 0.55, ease: "power3.out" }
      );
    }, root);
    return () => ctx.revert();
  }, [rendered, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!rendered) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col bg-coal"
      style={{ clipPath: "inset(0 0 100% 0)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
    >
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-5 md:px-8">
        <Image
          src="/logo.png"
          alt="2BHK — Bar Hauté Kitchen"
          width={44}
          height={55}
          className="h-11 w-auto md:h-12"
        />
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="label flex items-center gap-2 !text-cream transition-colors hover:!text-primary"
        >
          Close
          <span className="relative block h-4 w-4">
            <span className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current" />
            <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current" />
          </span>
        </button>
      </div>

      <div
        data-lenis-prevent
        className="flex flex-1 flex-col justify-between overflow-y-auto px-5 pb-8 md:flex-row md:items-end md:px-8 md:pb-12"
      >
        {/* nav links */}
        <nav className="flex flex-col gap-1 pt-6 md:gap-2">
          {links.map((l) => (
            <div key={l.href} className="overflow-hidden">
              <TransitionLink
                href={l.href}
                onNavigate={onClose}
                className="menu-link group flex items-baseline gap-3 md:gap-5"
              >
                <span className="label !text-primary">{l.n}</span>
                <span className="h-display text-[13vw] leading-[1.05] text-cream transition-colors duration-300 group-hover:text-primary sm:text-5xl md:text-7xl lg:text-8xl">
                  {l.label}
                </span>
              </TransitionLink>
            </div>
          ))}
        </nav>

        {/* right column: next event + meta */}
        <div className="mt-10 flex flex-col gap-8 md:mt-0 md:w-72 lg:w-80">
          {nextEvent && (
            <TransitionLink
              href={`/event/${nextEvent._id}`}
              onNavigate={onClose}
              className="menu-meta group block"
            >
              <p className="label mb-3">{nextEvent.isLive ? "Happening now" : "Next up"}</p>
              <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-sm bg-surface transition-transform duration-500 group-hover:scale-[1.02]">
                <Image
                  src={nextEvent.image}
                  alt={`${nextEvent.title} poster`}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              </div>
              <p className="font-display text-lg font-medium uppercase leading-tight">
                {nextEvent.title}
              </p>
              <p className="mt-1 text-sm text-muted">{eventDate(nextEvent.startdatetime)}</p>
            </TransitionLink>
          )}

          <div className="menu-meta flex flex-wrap gap-x-5 gap-y-2">
            {club.socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="label !text-cream transition-colors hover:!text-primary"
              >
                {s.name}
              </a>
            ))}
          </div>

          <div className="menu-meta flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5">
            {legal.map((l) => (
              <TransitionLink
                key={l.href}
                href={l.href}
                onNavigate={onClose}
                className="text-xs text-muted transition-colors hover:text-cream"
              >
                {l.label}
              </TransitionLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
