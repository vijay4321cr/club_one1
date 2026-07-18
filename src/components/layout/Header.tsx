"use client";

import { useEffect, useState } from "react";
import TransitionLink from "@/components/ui/TransitionLink";
import FullscreenMenu from "@/components/layout/FullscreenMenu";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
          scrolled
            ? "border-b border-line bg-coal/85 py-3 backdrop-blur-md"
            : "border-b border-transparent bg-transparent py-5"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 md:px-8">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="group flex items-center gap-3 text-cream"
          >
            <span className="flex h-4 w-6 flex-col justify-between">
              <span className="h-px w-full bg-current transition-transform duration-300 group-hover:scale-x-75 origin-left" />
              <span className="h-px w-full bg-current" />
              <span className="h-px w-full bg-current transition-transform duration-300 group-hover:scale-x-75 origin-right" />
            </span>
            <span className="label hidden !text-cream sm:block">Menu</span>
          </button>

          <div className="flex items-center gap-3">
            <TransitionLink href="/account" className="label hidden !text-cream transition-colors hover:!text-primary md:block">
              Account
            </TransitionLink>
            <TransitionLink
              href="/event"
              className="rounded-full bg-primary px-4 py-2 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal md:px-5"
            >
              Tickets
            </TransitionLink>
          </div>
        </div>
      </header>

      <FullscreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
