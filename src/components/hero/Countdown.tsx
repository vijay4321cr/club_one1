"use client";

import { useEffect, useState } from "react";

function parts(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor(diff / 3_600_000) % 24,
    m: Math.floor(diff / 60_000) % 60,
    s: Math.floor(diff / 1_000) % 60,
  };
}

export default function Countdown({ to, label }: { to: string; label: string }) {
  const target = +new Date(to);
  const [t, setT] = useState<ReturnType<typeof parts> | null>(null);

  useEffect(() => {
    setT(parts(target));
    const id = setInterval(() => setT(parts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const cells: [string, number][] = [
    ["Days", t?.d ?? 0],
    ["Hrs", t?.h ?? 0],
    ["Min", t?.m ?? 0],
    ["Sec", t?.s ?? 0],
  ];

  return (
    <div>
      <p className="label mb-3">{label}</p>
      <div className="flex items-start gap-4 md:gap-6">
        {cells.map(([unit, val], i) => (
          <div key={unit} className="flex items-start gap-4 md:gap-6">
            <div className="text-center">
              <span
                className={`h-display block text-3xl tabular-nums md:text-5xl ${
                  t ? "" : "opacity-30"
                }`}
              >
                {String(val).padStart(2, "0")}
              </span>
              <span className="label mt-1 block !text-[0.5625rem]">{unit}</span>
            </div>
            {i < 3 && <span className="h-display mt-0.5 text-2xl text-primary md:text-4xl">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
