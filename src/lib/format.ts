export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

/** exact rupee formatting — keeps the paise (no rounding to whole rupees).
 *  Use for fee/tax breakdowns and totals so CGST/SGST show precisely. */
export const inrExact = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/** compact rupees for tight labels — ₹400, ₹1k, ₹1.5k, ₹2k (≥1000 → k). */
export const inrCompact = (n: number) => {
  if (n < 1000) return `₹${Math.round(n)}`;
  const k = n / 1000;
  return `₹${Number.isInteger(k) ? k : k.toFixed(1)}k`;
};

export const eventDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export const eventDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Split a run-on "1. … 2. … 3. …" string into its individual points. Walks the
 * sequential markers (1., then 2., …) so numbers inside a sentence ("8 pm.",
 * "30 minutes") don't cause false splits. Returns [] when the text isn't a
 * numbered list starting at 1 — callers should render it as-is then.
 */
export function splitNumberedPoints(text: string): string[] {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!/^1\.\s/.test(t)) return [];
  const out: string[] = [];
  let idx = 0;
  let n = 1;
  while (idx < t.length) {
    const start = idx + `${n}.`.length;
    const marker = `${n + 1}.`;
    let from = start;
    let nextPos = -1;
    while (from <= t.length) {
      const p = t.indexOf(marker, from);
      if (p === -1) break;
      const prev = t[p - 1];
      if (prev === " " || prev === ".") {
        nextPos = p;
        break;
      }
      from = p + marker.length;
    }
    if (nextPos === -1) {
      out.push(t.slice(start).trim());
      break;
    }
    out.push(t.slice(start, nextPos).trim());
    idx = nextPos;
    n += 1;
  }
  return out.filter(Boolean);
}

/** Latest DOB (YYYY-MM-DD) allowed for a minimum age — use as a date input `max`. */
export function maxDobForAge(minAge = 21): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - minAge);
  return d.toISOString().slice(0, 10);
}

/** True when `dob` (YYYY-MM-DD) is at least `minAge` years in the past. */
export function isAtLeastAge(dob: string, minAge = 21): boolean {
  if (!dob) return false;
  const b = new Date(dob);
  if (Number.isNaN(+b)) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - minAge);
  cutoff.setHours(0, 0, 0, 0);
  return b <= cutoff;
}
