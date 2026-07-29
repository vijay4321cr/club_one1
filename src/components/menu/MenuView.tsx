"use client";

import { useMemo, useState } from "react";
import { menus, type MenuItem, type MenuSection } from "@/lib/data/menu";
import { smoothScrollTo } from "@/components/layout/LenisProvider";

/** ₹ + Indian comma grouping per "/"-separated variant, keeping words as-is */
function fmtPrice(price: string) {
  return price
    .split("/")
    .map((part) => {
      const t = part.trim();
      const n = Number(t.replace(/[^0-9.]/g, ""));
      return /^\d/.test(t) && isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : t;
    })
    .join(" / ");
}

/** the standard India veg / non-veg mark */
function DietMark({ veg }: { veg?: boolean }) {
  if (veg === undefined) return null;
  const color = veg ? "#22c55e" : "#e10600";
  return (
    <span
      aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
      className="mt-1 inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border"
      style={{ borderColor: color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

function Row({ item }: { item: MenuItem }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 py-4">
      <div className="flex min-w-0 gap-3">
        <DietMark veg={item.veg} />
        <div className="min-w-0">
          <p className="font-display text-[0.95rem] font-medium uppercase leading-snug tracking-wide md:text-base">
            {item.name}
            {item.base && <span className="ml-2 text-[0.625rem] normal-case tracking-normal text-gold">· {item.base}</span>}
          </p>
          {item.desc && <p className="mt-1 text-xs leading-relaxed text-muted md:text-[0.8125rem]">{item.desc}</p>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-display text-sm tabular-nums text-cream md:text-base">{fmtPrice(item.price)}</p>
        {item.priceNote && (
          <p className="mt-0.5 text-[0.5625rem] uppercase tracking-[0.12em] text-muted">{item.priceNote}</p>
        )}
      </div>
    </div>
  );
}

export default function MenuView() {
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const menu = menus[active];

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) smoothScrollTo(el, { offset: -96, duration: 0.9 });
  };

  // filter the active menu's sections by name / description / spirit base
  const q = query.trim().toLowerCase();
  const sections: MenuSection[] = useMemo(() => {
    if (!q) return menu.sections;
    return menu.sections
      .map((s) => ({
        ...s,
        items: s.items.filter((it) =>
          [it.name, it.desc, it.base, s.title, s.subtitle]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [menu, q]);
  const resultCount = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div>
      {/* Kitchen / Bar toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-line p-1">
          {menus.map((m, i) => (
            <button
              key={m.key}
              onClick={() => {
                setActive(i);
                smoothScrollTo(0, { duration: 0.6 });
              }}
              className={`rounded-full px-6 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] transition-colors ${
                i === active ? "bg-primary text-cream" : "text-muted hover:text-cream"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {menu.intro && (
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-muted">{menu.intro}</p>
      )}

      {/* search */}
      <div className="mx-auto mt-8 flex max-w-md items-center gap-3 border-b border-line focus-within:border-primary">
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 stroke-muted" fill="none" strokeWidth="2" aria-hidden>
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search the ${menu.label.toLowerCase()} menu…`}
          aria-label="Search menu"
          className="w-full bg-transparent py-2.5 text-base text-cream placeholder:text-muted/60 focus:outline-none sm:text-sm"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="label shrink-0 !text-muted transition-colors hover:!text-cream"
          >
            Clear
          </button>
        )}
      </div>
      {q && (
        <p className="mt-3 text-center text-[0.6875rem] uppercase tracking-[0.16em] text-muted">
          {resultCount} result{resultCount === 1 ? "" : "s"} for &ldquo;{query.trim()}&rdquo;
        </p>
      )}

      {/* section jump index — hidden while searching */}
      {!q && (
        <div className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:justify-center md:px-0">
          {menu.sections.map((s, i) => (
            <button
              key={s.title}
              onClick={() => jump(`sec-${menu.key}-${i}`)}
              className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-muted transition-colors hover:border-cream hover:text-cream"
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {/* sections */}
      {sections.length === 0 ? (
        <p className="mt-14 text-center text-sm text-muted">
          Nothing on the {menu.label.toLowerCase()} menu matches that — try another dish, drink or ingredient.
        </p>
      ) : (
        <div className="mt-12 space-y-14">
          {sections.map((s, i) => (
            <section key={s.title} id={`sec-${menu.key}-${i}`} className="scroll-mt-24">
              <div className="mb-5 border-b border-line pb-3">
                <h2 className="font-display text-2xl font-medium uppercase leading-none md:text-3xl">
                  {s.title}
                  <span className="text-primary">.</span>
                </h2>
                {s.subtitle && (
                  <p className="mt-2 text-[0.6875rem] uppercase tracking-[0.16em] text-gold">{s.subtitle}</p>
                )}
              </div>
              <div>
                {s.items.map((item) => (
                  <Row key={item.name} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-14 text-center text-[0.6875rem] uppercase tracking-[0.16em] text-muted">
        Government taxes extra as applicable
      </p>
    </div>
  );
}
