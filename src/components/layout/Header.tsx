"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import TransitionLink from "@/components/ui/TransitionLink";
import FullscreenMenu from "@/components/layout/FullscreenMenu";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };

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

          {/* account — filled red pill, white icon badge + bold label */}
          <TransitionLink
            href="/account"
            aria-label="My account"
            className="group flex items-center gap-2 rounded-full bg-primary py-1.5 pl-1.5 pr-3.5 text-cream shadow-sm shadow-primary/30 transition-colors hover:bg-cream hover:text-primary"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cream text-primary transition-colors group-hover:bg-primary group-hover:text-cream">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10z" />
                <path d="M12 14c-4.42 0-8 2.69-8 6v1h16v-1c0-3.31-3.58-6-8-6z" />
              </svg>
            </span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]">Account</span>
          </TransitionLink>
        </div>
      </header>

      {/* floating back button (all pages except home) */}
      {!isHome && (
        <button
          onClick={goBack}
          aria-label="Go back"
          className="group fixed left-5 top-[4.5rem] z-30 flex items-center gap-1.5 rounded-full border border-line bg-coal/80 px-3.5 py-2 text-cream backdrop-blur-md transition-colors hover:border-primary hover:text-primary md:left-8"
        >
          <span className="text-sm leading-none transition-transform duration-300 group-hover:-translate-x-0.5">
            ←
          </span>
          <span className="label !text-current">Back</span>
        </button>
      )}

      <FullscreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
