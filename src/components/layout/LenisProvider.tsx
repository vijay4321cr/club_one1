"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let lenisInstance: Lenis | null = null;

/** Scroll to top through Lenis so its internal position stays in sync. */
export function scrollToTop() {
  if (lenisInstance) {
    lenisInstance.scrollTo(0, { immediate: true, force: true });
  } else {
    window.scrollTo(0, 0);
  }
}

export default function LenisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // `content: document.body` is essential: our <html> is h-full (always
    // viewport-sized), so observing it never detects page-height changes —
    // Lenis would keep a stale scroll limit and freeze scrolling partway
    // down longer pages after navigating. The body actually grows.
    const lenis = new Lenis({
      lerp: 0.12,
      smoothWheel: true,
      content: document.body,
    });
    lenisInstance = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // overlays (menu, modals, age gate) lock scrolling via
    // body.style.overflow = "hidden" — pause Lenis while locked so it
    // stops hijacking wheel events and scrolling the page behind them
    const syncLock = () => {
      if (document.body.style.overflow === "hidden") lenis.stop();
      else lenis.start();
    };
    syncLock();
    const observer = new MutationObserver(syncLock);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    return () => {
      observer.disconnect();
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  // re-measure after every route change (new page = new height), once
  // immediately after paint and again after images/lazy content settle
  useEffect(() => {
    if (!lenisInstance) return;
    const measure = () => {
      lenisInstance?.resize();
      ScrollTrigger.refresh();
    };
    const t1 = window.setTimeout(measure, 100);
    const t2 = window.setTimeout(measure, 800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname]);

  return <>{children}</>;
}
