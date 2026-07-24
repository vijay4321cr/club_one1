"use client";

import { useState } from "react";

interface Step {
  title: string;
  body: string;
  /** where the animated tap indicator sits inside the map */
  tap: { x: string; y: string };
  /** show the colour legend under the copy */
  legend?: boolean;
}

const STEPS: Step[] = [
  {
    title: "Pick your zone",
    body: "The floor is split into zones — Indoor, Cabana, Elevated and more. Each glowing dot is one zone. Tap a dot (or anywhere inside its outline) to open it.",
    tap: { x: "50%", y: "44%" },
  },
  {
    title: "Choose a table",
    body: "Once a zone opens you'll see every table with its price per guest. Tap a green table to select it — the dot turns bright with a ✓.",
    tap: { x: "42%", y: "52%" },
    legend: true,
  },
  {
    title: "Move around the map",
    body: "Drag with one finger to pan, pinch (or scroll) to zoom. Tap empty floor to zoom back out, or use ← Overview any time.",
    tap: { x: "58%", y: "48%" },
  },
  {
    title: "Book and you're done",
    body: "You can add more tables from the same zone. When you're happy, hit Book Now at the bottom, set your party size and pay — that's it.",
    tap: { x: "50%", y: "82%" },
  },
];

export default function MapGuide({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col justify-end bg-coal/80 backdrop-blur-[2px]"
      // never let guide taps reach the map underneath
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="How to use the floor map"
    >
      {/* animated tap indicator */}
      <div
        className="pointer-events-none absolute"
        style={{ left: step.tap.x, top: step.tap.y }}
      >
        <span className="relative block -translate-x-1/2 -translate-y-1/2">
          <span className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-cream/70" />
          <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cream bg-cream/20" />
          {/* pointing hand */}
          <svg
            viewBox="0 0 24 24"
            className="guide-tap absolute left-1/2 top-1/2 h-8 w-8 text-cream drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
            fill="currentColor"
          >
            <path d="M11 2.5a1.5 1.5 0 013 0V10h.5V4.5a1.5 1.5 0 013 0V11h.5V7.5a1.5 1.5 0 013 0V15a6.5 6.5 0 01-6.5 6.5h-1A6.5 6.5 0 017 15v-.7l-2.2-3.1a1.5 1.5 0 012.4-1.8L8.5 11V2.5a1.5 1.5 0 013 0z" />
          </svg>
        </span>
      </div>

      {/* card */}
      <div className="relative m-3 rounded-lg border border-line bg-surface/95 p-4 shadow-2xl shadow-black/60 sm:m-5 sm:p-5">
        <p className="label mb-2 !text-[0.5625rem] !text-primary">
          Step {i + 1} of {STEPS.length}
        </p>
        <h4 className="font-display text-lg font-semibold uppercase leading-tight">{step.title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>

        {step.legend && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.625rem] uppercase tracking-[0.12em] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Sold out
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gold" /> Unavailable
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="label !text-muted transition-colors hover:!text-cream"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map((s, k) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all ${
                  k === i ? "w-5 bg-primary" : "w-1.5 bg-line"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => (last ? onClose() : setI(i + 1))}
            className="rounded-full bg-primary px-5 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-cream hover:text-coal"
          >
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
