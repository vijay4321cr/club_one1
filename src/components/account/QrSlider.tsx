"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import TicketQr from "@/components/account/TicketQr";

export interface QrSlide {
  qrstring?: string;
  qrcode?: string;
  qrcodeimage?: string;
  code?: string; // shown under codeLabel (e.g. ticket/guest code)
}

/** one tab of QRs — e.g. all the passes of a single ticket category */
export interface QrGroup {
  label: string;
  slides: QrSlide[];
}

interface Props {
  slides?: QrSlide[];
  /** when a booking spans several ticket categories, show a tab per category */
  groups?: QrGroup[];
  /** small caption above the code, e.g. "Ticket code" / "Guest code" */
  codeLabel?: string;
  /** singular noun for the x/N counter, e.g. "Pass" / "Guest" */
  unit?: string;
  /** footnote under the slider */
  footnote?: string;
}

/**
 * Ticket-stub QR carousel — one cream stub at a time, swipe / ← dots → to move.
 * Shared by ticket passes and table-booking guest QRs so both look identical.
 * With `groups`, a tab row appears and the stub drops in from the active tab.
 */
export default function QrSlider({
  slides,
  groups,
  codeLabel = "Ticket code",
  unit = "Pass",
  footnote = "Show this at the gate",
}: Props) {
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState(0);
  // falls back to the text wordmark if the light-bg logo file isn't there yet
  const [logoOk, setLogoOk] = useState(true);
  const touchX = useRef<number | null>(null);

  const tabs: QrGroup[] = groups?.length ? groups : [{ label: "", slides: slides ?? [] }];
  const active = Math.min(tab, tabs.length - 1);
  const items = tabs[active].slides;
  const total = items.length;
  const go = (i: number) => setIdx(Math.max(0, Math.min(total - 1, i)));

  return (
    <div>
      {/* category tabs — the stub appears to drop out of the one you tap */}
      {tabs.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          {tabs.map((g, k) => (
            <button
              key={g.label}
              onClick={() => {
                setTab(k);
                setIdx(0);
              }}
              className={`rounded-full px-4 py-2 text-[0.625rem] font-semibold uppercase tracking-[0.14em] transition-all duration-300 ${
                k === active
                  ? "bg-primary text-cream shadow-lg shadow-primary/25"
                  : "border border-line text-muted hover:border-cream hover:text-cream"
              }`}
            >
              {g.label}
              <span className="ml-1.5 opacity-70">{g.slides.length}</span>
            </button>
          ))}
        </div>
      )}
      <div
        // re-keyed per tab so the stub re-plays its drop-in from that tab
        key={active}
        className="qr-drop overflow-hidden"
        style={{
          ["--drop-origin" as string]: `${((active + 0.5) / tabs.length) * 100}%`,
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (dx < -40) go(idx + 1);
          if (dx > 40) go(idx - 1);
          touchX.current = null;
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {items.map((s, i) => (
            <div
              key={s.code ?? i}
              className="flex min-w-full flex-col items-center px-2"
              aria-hidden={i !== idx}
            >
              {/* themed ticket stub */}
              <div className="w-64 overflow-hidden rounded-lg bg-cream text-coal shadow-lg shadow-black/40">
                <div className="p-5 pb-4">
                  <div className="mx-auto h-48 w-48">
                    <TicketQr
                      qrstring={s.qrstring}
                      qrcode={s.qrcode}
                      qrcodeimage={s.qrcodeimage}
                      className="h-full w-full"
                    />
                  </div>
                </div>

                {/* perforated tear line */}
                <div className="relative flex items-center">
                  <span aria-hidden className="absolute -left-3 h-6 w-6 rounded-full bg-surface" />
                  <span aria-hidden className="absolute -right-3 h-6 w-6 rounded-full bg-surface" />
                  <span aria-hidden className="mx-5 w-full border-t-2 border-dashed border-coal/20" />
                </div>

                {/* stub: code + brand */}
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.5625rem] font-semibold uppercase tracking-[0.2em] text-coal/50">
                      {codeLabel}
                    </p>
                    {/* full code, never truncated — font shrinks as it grows */}
                    <p
                      className={`font-display font-semibold uppercase leading-tight break-all tracking-[0.06em] ${
                        (s.code?.length ?? 0) > 14
                          ? "text-[0.7rem]"
                          : (s.code?.length ?? 0) > 9
                            ? "text-sm"
                            : "text-lg"
                      }`}
                    >
                      {s.code}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {/* light-background logo (red 2 + black BHK) sits directly on the stub */}
                    {logoOk ? (
                      <Image
                        src="/2bhk_alfresco.png"
                        alt="2BHK — Bar Hauté Kitchen"
                        width={56}
                        height={58}
                        className="h-9 w-auto"
                        onError={() => setLogoOk(false)}
                      />
                    ) : (
                      <p className="font-display text-xl font-extrabold uppercase leading-none tracking-tight text-coal">
                        <span className="text-primary">2</span>BHK
                      </p>
                    )}
                    {total > 1 && (
                      <p className="text-[0.5625rem] font-semibold uppercase tracking-[0.2em] text-coal/50">
                        {unit} {i + 1}/{total}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* controls */}
      {total > 1 && (
        <div className="mt-4 flex items-center justify-center gap-5">
          <button
            onClick={() => go(idx - 1)}
            disabled={idx === 0}
            aria-label={`Previous ${unit.toLowerCase()}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line transition-colors enabled:hover:border-cream disabled:opacity-30"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            {items.map((s, i) => (
              <button
                key={s.code ?? i}
                onClick={() => go(i)}
                aria-label={`Go to ${unit.toLowerCase()} ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === idx ? "w-6 bg-primary" : "w-2 bg-line hover:bg-cream/40"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => go(idx + 1)}
            disabled={idx === total - 1}
            aria-label={`Next ${unit.toLowerCase()}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line transition-colors enabled:hover:border-cream disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}

      <p className="label mt-5 text-center !text-[0.5625rem]">{footnote}</p>
    </div>
  );
}
