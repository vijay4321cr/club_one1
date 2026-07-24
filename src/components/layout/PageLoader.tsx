"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * First-load intro overlay — counts 0→100 over the brand mark, then lifts away.
 * Shows once per browser session so internal reloads aren't nagged.
 */
export default function PageLoader() {
  const [count, setCount] = useState(0);
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("bhk:intro")) return;
    setShow(true);
    document.body.style.overflow = "hidden";

    let n = 0;
    const tick = setInterval(() => {
      n = Math.min(100, n + Math.floor(Math.random() * 9) + 4);
      setCount(n);
      if (n >= 100) {
        clearInterval(tick);
        sessionStorage.setItem("bhk:intro", "1");
        setTimeout(() => setLeaving(true), 300);
        setTimeout(() => {
          setShow(false);
          document.body.style.overflow = "";
        }, 1100);
      }
    }, 95);

    return () => {
      clearInterval(tick);
      document.body.style.overflow = "";
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-coal transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${
        leaving ? "pointer-events-none -translate-y-full" : "translate-y-0"
      }`}
    >
      <Image
        src="/logo.png"
        alt="2BHK — Bar Hauté Kitchen"
        width={140}
        height={175}
        priority
        className="h-24 w-auto md:h-28"
      />

      {/* big counter */}
      <div className="mt-10 flex items-end gap-1">
        <span className="h-display text-6xl leading-none tabular-nums md:text-7xl">{count}</span>
        <span className="mb-1 font-display text-xl text-primary">%</span>
      </div>

      {/* progress line */}
      <div className="mt-6 h-px w-56 overflow-hidden bg-line md:w-72">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${count}%` }}
        />
      </div>
      <p className="label mt-4 !text-[0.5625rem] !text-muted">Setting the mood…</p>
    </div>
  );
}
