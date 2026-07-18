"use client";

import { useEffect, useState } from "react";
import TransitionLink from "@/components/ui/TransitionLink";

const KEY = "twobhk_cookies";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const decide = (v: "all" | "essential") => {
    localStorage.setItem(KEY, v);
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-60 p-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="rounded-sm border border-line bg-surface/95 p-5 backdrop-blur-md">
        <p className="text-sm leading-relaxed text-cream/90">
          We use cookies for essential site functions and, with your consent, analytics. See our{" "}
          <TransitionLink href="/legal/privacy" className="underline underline-offset-2 hover:text-primary">
            Privacy Policy
          </TransitionLink>
          .
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => decide("all")}
            className="rounded-full bg-primary px-5 py-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors hover:bg-cream hover:text-coal"
          >
            Accept all
          </button>
          <button
            onClick={() => decide("essential")}
            className="rounded-full border border-line px-5 py-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors hover:border-cream"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
