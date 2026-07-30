"use client";

import { useState } from "react";
import { splitNumberedPoints } from "@/lib/format";

/**
 * Terms & conditions shown inline and expandable inside a checkout popup, so
 * opening them never navigates away and tears the popup down. Numbered
 * "1. 2. 3." terms render one point per line. Falls back to a new-tab link to
 * the club's legal terms only when the event carries no terms text of its own.
 */
export default function TermsDisclosure({ terms }: { terms?: string }) {
  const [open, setOpen] = useState(false);
  const text = terms?.trim();

  if (!text) {
    return (
      <a
        href="/legal/terms"
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex items-center justify-between gap-2 rounded-md border border-line p-4 text-xs font-medium uppercase tracking-[0.14em] underline underline-offset-4 transition-colors hover:text-primary"
      >
        Terms and conditions
        <span aria-hidden className="no-underline">↗</span>
      </a>
    );
  }

  const points = splitNumberedPoints(text);

  return (
    <div className="mt-4 rounded-md border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4 text-xs font-medium uppercase tracking-[0.14em] transition-colors hover:text-primary"
      >
        Terms and conditions
        <span
          className={`inline-block text-xs transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div data-lenis-prevent className="max-h-56 overflow-y-auto px-4 pb-4">
            {points.length > 1 ? (
              <ol className="space-y-2 text-xs leading-relaxed text-muted">
                {points.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 text-primary">{i + 1}.</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="whitespace-pre-line text-xs leading-relaxed text-muted">{text}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
