"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * First-paint intro overlay. It is rendered in the initial HTML (show=true) so
 * it covers the page from the very first frame — no flash of the hero/logo/video
 * behind it. The counter tracks REAL load progress: it creeps up while assets
 * download and only completes once `window` has fully loaded (all images, the
 * gallery, the hero video poster…), then lifts away. A 10s cap prevents hangs.
 */
export default function PageLoader() {
  const [count, setCount] = useState(0);
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    let done = false;
    let raf = 0;
    let progress = 0;

    const finish = () => {
      if (done) return;
      done = true;
      setCount(100);
      setTimeout(() => setLeaving(true), 320);
      setTimeout(() => {
        setShow(false);
        document.body.style.overflow = "";
      }, 1150);
    };

    const tick = () => {
      const complete = document.readyState === "complete";
      // creep toward 92% while still loading; race to 100% once everything's in
      const target = complete ? 100 : 92;
      progress += (target - progress) * 0.05 + 0.35;
      if (progress > 100) progress = 100;
      setCount(Math.min(complete ? 100 : 99, Math.round(progress)));
      if (complete && progress >= 99.5) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // hard guarantee we finish even if a big asset (e.g. video) stalls
    const cap = window.setTimeout(finish, 10000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cap);
      document.body.style.overflow = "";
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-coal transition-transform duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${
        leaving ? "-translate-y-full" : "translate-y-0"
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

      {/* big live counter */}
      <div className="mt-10 flex items-end gap-1">
        <span className="h-display text-6xl leading-none tabular-nums md:text-7xl">{count}</span>
        <span className="mb-1 font-display text-xl text-primary">%</span>
      </div>

      {/* progress line — tied to the real counter */}
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
