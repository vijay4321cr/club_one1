"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import gsap from "gsap";
import { scrollToTop } from "@/components/layout/LenisProvider";

const TransitionContext = createContext<(href: string) => void>(() => {});

export function useTransitionNav() {
  return useContext(TransitionContext);
}

/** Curtain transition between routes — no hard cuts. */
export default function PageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname || pendingRef.current) {
        if (href !== pathname) router.push(href);
        return;
      }
      const overlay = overlayRef.current;
      if (!overlay || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
        return;
      }
      pendingRef.current = true;
      gsap.set(overlay, { display: "flex", yPercent: 100 });
      gsap.to(overlay, {
        yPercent: 0,
        duration: 0.45,
        ease: "power3.inOut",
        onComplete: () => router.push(href),
      });
    },
    [pathname, router]
  );

  useEffect(() => {
    if (!pendingRef.current) return;
    pendingRef.current = false;
    const overlay = overlayRef.current;
    if (!overlay) return;
    scrollToTop();
    gsap.to(overlay, {
      yPercent: -100,
      duration: 0.5,
      delay: 0.15,
      ease: "power3.inOut",
      onComplete: () => gsap.set(overlay, { display: "none", yPercent: 100 }),
    });
  }, [pathname]);

  return (
    <TransitionContext.Provider value={navigate}>
      {children}
      <div
        ref={overlayRef}
        aria-hidden
        className="fixed inset-0 z-90 hidden items-center justify-center border-y-2 border-primary bg-coal"
      >
        <Image
          src="/logo.png"
          alt=""
          width={120}
          height={150}
          className="h-28 w-auto animate-pulse md:h-36"
        />
      </div>
    </TransitionContext.Provider>
  );
}
