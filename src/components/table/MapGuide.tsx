"use client";

import { useEffect, useRef, useState } from "react";

/** what the walkthrough is allowed to do to the REAL map */
export interface GuideDriver {
  overview: () => void;
  openZone: (id: string) => void;
  select: (id: string | null) => void;
  markUnavailable: (id: string | null) => void;
  demoZoneId: string | null;
  demoZoneLabel: string;
  demoTableId: string | null;
  demoZone2Id: string | null;
  demoZone2Label: string;
}

interface Step {
  title: string;
  body: string;
  /** performed on the real map when this step becomes active */
  run: (d: GuideDriver) => void;
  /** id of the real pin the animated hand should hover/tap this step (data-spot-id) */
  target?: (d: GuideDriver) => string | null;
}

const STEPS: Step[] = [
  {
    title: "This is the floor plan",
    body: "Each glowing dot is a seating zone. Drag with one finger to pan, pinch or scroll to zoom.",
    run: (d) => {
      d.select(null);
      d.markUnavailable(null);
      d.overview();
    },
  },
  {
    title: "Open a zone",
    body: "The hand taps a zone — or you can tap anywhere inside its outline — and the map zooms in to show its tables. Watch it open now.",
    run: (d) => {
      d.select(null);
      d.overview();
      // let the hand land on the zone dot first, then open it
      if (d.demoZoneId) setTimeout(() => d.openZone(d.demoZoneId!), 900);
    },
    target: (d) => d.demoZoneId,
  },
  {
    title: "Pick a table",
    body: "The hand taps a green table to select it — it lights up with a ✓. Tap it again to remove it. You can add more tables from the same zone.",
    run: (d) => {
      if (d.demoZoneId) d.openZone(d.demoZoneId);
      if (d.demoTableId) setTimeout(() => d.select(d.demoTableId), 700);
    },
    target: (d) => d.demoTableId,
  },
  {
    title: "Availability is live",
    body: "Prices and tables update in real time. A zone outline turns red the moment it's fully booked (yellow if unavailable) — no refresh needed. Watch this zone change.",
    run: (d) => {
      d.select(null);
      d.overview();
      if (d.demoZone2Id) setTimeout(() => d.markUnavailable(d.demoZone2Id!), 500);
    },
    target: (d) => d.demoZone2Id,
  },
  {
    title: "Zoom back out anytime",
    body: "Tap empty floor or the “Overview” button to zoom out. That's it — pick your zone, choose your tables, then hit Book Now.",
    run: (d) => {
      d.markUnavailable(null);
      d.overview();
    },
  },
];

export default function MapGuide({ driver, onClose }: { driver: GuideDriver; onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const rootRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  // run the first step's map action as the tour opens
  useEffect(() => {
    STEPS[0].run(driver);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the animated hand glued to the REAL target pin as the map pans/zooms
  const targetId = step.target?.(driver) ?? null;
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const root = rootRef.current;
      const hand = handRef.current;
      if (root && hand) {
        const el = targetId
          ? (document.querySelector(`[data-spot-id="${targetId}"]`) as HTMLElement | null)
          : null;
        if (el) {
          const r = el.getBoundingClientRect();
          const rr = root.getBoundingClientRect();
          hand.style.opacity = "1";
          hand.style.transform = `translate(${r.left - rr.left + r.width / 2}px, ${
            r.top - rr.top + r.height / 2
          }px)`;
        } else {
          hand.style.opacity = "0";
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [targetId]);

  const go = (n: number) => {
    const idx = Math.max(0, Math.min(STEPS.length - 1, n));
    setI(idx);
    STEPS[idx].run(driver);
  };

  return (
    // sits over the map but leaves it fully visible & animating; the invisible
    // layer only swallows stray taps so they don't fight the tour
    <div ref={rootRef} className="absolute inset-0 z-40 flex flex-col justify-end">
      <div
        className="absolute inset-0"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />

      {/* animated hand — follows the real pin it's tapping */}
      <div
        ref={handRef}
        className="pointer-events-none absolute left-0 top-0 z-10"
        style={{ opacity: 0, willChange: "transform" }}
      >
        <span className="relative block">
          <span className="absolute -left-6 -top-6 h-12 w-12 animate-ping rounded-full border-2 border-cream/70" />
          <span className="absolute -left-3.5 -top-3.5 h-7 w-7 rounded-full border-2 border-cream bg-cream/25" />
          <svg
            viewBox="0 0 24 24"
            className="guide-tap absolute left-1 top-2 h-8 w-8 text-cream drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
            fill="currentColor"
          >
            <path d="M11 2.5a1.5 1.5 0 013 0V10h.5V4.5a1.5 1.5 0 013 0V11h.5V7.5a1.5 1.5 0 013 0V15a6.5 6.5 0 01-6.5 6.5h-1A6.5 6.5 0 017 15v-.7l-2.2-3.1a1.5 1.5 0 012.4-1.8L8.5 11V2.5a1.5 1.5 0 013 0z" />
          </svg>
        </span>
      </div>

      {/* legend so colour changes make sense */}
      <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 gap-3 rounded-full bg-coal/85 px-3 py-1.5 text-[0.5625rem] uppercase tracking-[0.12em] text-cream backdrop-blur-sm">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Available</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Booked</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold" /> Unavailable</span>
      </div>

      {/* step card */}
      <div className="relative m-3 rounded-lg border border-line bg-surface/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-md sm:m-5 sm:p-5">
        <p className="label mb-2 !text-[0.5625rem] !text-primary">
          Guided tour · {i + 1} / {STEPS.length}
        </p>
        <h4 className="font-display text-lg font-semibold uppercase leading-tight">{step.title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button onClick={onClose} className="label !text-muted transition-colors hover:!text-cream">
            Skip
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map((s, k) => (
              <button
                key={s.title}
                onClick={() => go(k)}
                aria-label={`Step ${k + 1}`}
                className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-primary" : "w-1.5 bg-line"}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                onClick={() => go(i - 1)}
                className="rounded-full border border-line px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:border-cream hover:text-cream"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (last ? onClose() : go(i + 1))}
              className="rounded-full bg-primary px-5 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-cream hover:text-coal"
            >
              {last ? "Start booking" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
