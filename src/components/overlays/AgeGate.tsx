"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";

const KEY = "twobhk_age_ok";

/** 21+ age verification shown once per device. */
export default function AgeGate() {
  const [show, setShow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  useEffect(() => {
    if (!show || !rootRef.current) return;
    document.body.style.overflow = "hidden";
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".age-item",
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, delay: 0.2, ease: "power3.out" }
      );
    }, rootRef.current);
    return () => {
      document.body.style.overflow = "";
      ctx.revert();
    };
  }, [show]);

  if (!show) return null;

  const confirm = () => {
    localStorage.setItem(KEY, "1");
    const root = rootRef.current;
    if (!root) return setShow(false);
    gsap.to(root, {
      autoAlpha: 0,
      duration: 0.5,
      ease: "power2.inOut",
      onComplete: () => setShow(false),
    });
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Age verification"
      className="noise fixed inset-0 z-100 flex flex-col items-center justify-center bg-coal px-5 text-center"
    >
      <Image
        src="/logo.png"
        alt="2BHK — Bar Hauté Kitchen"
        width={80}
        height={100}
        priority
        className="age-item mb-4 h-24 w-auto"
      />
      <h2 className="age-item h-display text-5xl md:text-7xl">
        21<span className="text-primary">+</span>
      </h2>
      <p className="age-item mt-4 max-w-xs text-sm leading-relaxed text-muted">
        This website is intended for adults of legal drinking age. Are you 21 or older?
      </p>
      <div className="age-item mt-8 flex gap-3">
        <button
          onClick={confirm}
          className="rounded-full bg-primary px-8 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal"
        >
          Yes, I am 21+
        </button>
        <a
          href="https://www.google.com"
          className="rounded-full border border-line px-8 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:border-cream"
        >
          No, exit
        </a>
      </div>
      <p className="age-item label mt-8 !text-[0.5625rem]">Drink responsibly.</p>
    </div>
  );
}
