"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { inr } from "@/lib/format";
import type { TableLayout, TableZone, TableSpot } from "@/types";

interface Props {
  layout: TableLayout;
  selectedIds: string[];
  onToggle: (zone: TableZone, table: TableSpot) => void;
}

type View = { s: number; tx: number; ty: number; min: number; max: number };

const TAP_SLOP = 8; // px of movement below which a pointer up counts as a tap

export default function FloorMap({ layout, selectedIds, onToggle }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const [zoneId, setZoneId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [natSize, setNatSize] = useState({ w: 0, h: 0 }); // render-safe copy of nat ref

  const zone = layout.areas.find((z) => z._id === zoneId) ?? null;
  const selectedSet = new Set(selectedIds);
  const zonesWithSelection = new Set(
    layout.areas.filter((z) => z.tables?.some((t) => selectedSet.has(t._id))).map((z) => z._id)
  );

  const nat = useRef({ w: 0, h: 0 }); // natural image px
  const view = useRef<View>({ s: 1, tx: 0, ty: 0, min: 0.2, max: 8 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const pinch = useRef({ dist: 0, s: 1 });
  const moved = useRef(0);
  const dragged = useRef(false);

  /* apply the current transform imperatively (no React re-render on drag) */
  const apply = useCallback((animate = false) => {
    const l = layerRef.current;
    if (!l) return;
    const v = view.current;
    l.style.transition = animate ? "transform 0.45s cubic-bezier(0.22,1,0.36,1)" : "none";
    l.style.transform = `translate3d(${v.tx}px, ${v.ty}px, 0) scale(${v.s})`;
    l.style.setProperty("--s", String(v.s));
  }, []);

  const clamp = (s: number) => Math.max(view.current.min, Math.min(view.current.max, s));

  const zoomAt = (ax: number, ay: number, targetS: number, animate = false) => {
    const v = view.current;
    const s2 = clamp(targetS);
    v.tx = ax - (s2 / v.s) * (ax - v.tx);
    v.ty = ay - (s2 / v.s) * (ay - v.ty);
    v.s = s2;
    apply(animate);
  };

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || !nat.current.w) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const fitS = Math.min(vw / nat.current.w, vh / nat.current.h);
    view.current.min = fitS * 0.85;
    view.current.max = fitS * 7;
    view.current.s = fitS;
    view.current.tx = (vw - nat.current.w * fitS) / 2;
    view.current.ty = (vh - nat.current.h * fitS) / 2;
    apply(true);
  }, [apply]);

  /* frame a normalized bounds box into the viewport (zone focus) */
  const focusBounds = useCallback(
    (b: { xMin: number; yMin: number; xMax: number; yMax: number }) => {
      const vp = viewportRef.current;
      if (!vp || !nat.current.w) return;
      const vw = vp.clientWidth;
      const vh = vp.clientHeight;
      const bw = Math.max(0.02, b.xMax - b.xMin) * nat.current.w;
      const bh = Math.max(0.02, b.yMax - b.yMin) * nat.current.h;
      const cx = ((b.xMin + b.xMax) / 2) * nat.current.w;
      const cy = ((b.yMin + b.yMax) / 2) * nat.current.h;
      const s2 = clamp(Math.min(vw / bw, vh / bh) * 0.82);
      view.current.s = s2;
      view.current.tx = vw / 2 - s2 * cx;
      view.current.ty = vh / 2 - s2 * cy;
      apply(true);
    },
    [apply]
  );

  /* a zone's frame — explicit focusBounds, else derived from its tables/outline */
  const boundsForZone = useCallback((z: TableZone) => {
    if (z.focusBounds) return z.focusBounds;
    const pts = [
      ...(z.tables?.length ? z.tables.map((t) => t.hotspot) : [z.hotspot]),
      ...(z.outlinePolygon ?? []),
    ];
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = 0.035;
    return {
      xMin: Math.min(...xs) - pad,
      yMin: Math.min(...ys) - pad,
      xMax: Math.max(...xs) + pad,
      yMax: Math.max(...ys) + pad,
    };
  }, []);

  const focusZone = useCallback(
    (z: TableZone, zoom = true) => {
      setZoneId(z._id);
      if (zoom) requestAnimationFrame(() => focusBounds(boundsForZone(z)));
    },
    [boundsForZone, focusBounds]
  );

  // a nice zone to open by default so the map lands "showcasing" a section
  const defaultZone =
    layout.areas.find((z) => z.tables?.some((t) => t.pinColor === "green")) ??
    layout.areas.find((z) => z.tables?.length) ??
    null;

  /* image load → measure, fit, then smoothly showcase a zone */
  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    nat.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
    setNatSize(nat.current);
    fit();
    // let the fitted plan paint, fade the loader, then glide into a zone
    setTimeout(() => setReady(true), 150);
    if (defaultZone) setTimeout(() => focusZone(defaultZone), 650);
  };

  /* refit on resize — keep the focused zone framed */
  useEffect(() => {
    const onResize = () => {
      if (!zoneId) fit();
      else if (zone) focusBounds(boundsForZone(zone));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [zoneId, zone, fit, focusBounds, boundsForZone]);

  /* wheel zoom (non-passive so we can preventDefault) */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(e.clientX - r.left, e.clientY - r.top, view.current.s * factor);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- pointer gestures: 1-finger/mouse pan, 2-finger pinch ---- */
  const relXY = (e: PointerEvent | React.PointerEvent) => {
    const r = viewportRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const p = relXY(e);
    pointers.current.set(e.pointerId, p);
    moved.current = 0;
    dragged.current = false;
    if (pointers.current.size === 1) {
      pan.current = { x: p.x, y: p.y, tx: view.current.tx, ty: view.current.ty };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: view.current.s };
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !viewportRef.current) return;
    const p = relXY(e);
    pointers.current.set(e.pointerId, p);

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (pinch.current.dist > 0) {
        zoomAt(mid.x, mid.y, pinch.current.s * (dist / pinch.current.dist));
      }
      dragged.current = true;
      return;
    }

    // single-pointer pan
    const dx = p.x - pan.current.x;
    const dy = p.y - pan.current.y;
    moved.current += Math.abs(dx) + Math.abs(dy);
    if (moved.current > TAP_SLOP) dragged.current = true;
    view.current.tx = pan.current.tx + (p.x - pan.current.x);
    view.current.ty = pan.current.ty + (p.y - pan.current.y);
    apply();
  };

  const onPointerUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      // dropped from pinch to pan — reseat the pan origin
      const [only] = [...pointers.current.values()];
      pan.current = { x: only.x, y: only.y, tx: view.current.tx, ty: view.current.ty };
    }
    if (pointers.current.size === 0) {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }
  };

  const zoomButton = (dir: 1 | -1) => {
    const vp = viewportRef.current;
    if (!vp) return;
    zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, view.current.s * (dir > 0 ? 1.4 : 1 / 1.4), true);
  };

  const backToOverview = () => {
    setZoneId(null);
    requestAnimationFrame(() => fit());
  };

  const pinColor = (c: string) =>
    c === "green" ? "#22c55e" : c === "red" ? "#e10600" : c === "blue" ? "#3b82f6" : "#c9a227";
  const pinTop = (c: string) =>
    c === "green" ? "#bbf7d0" : c === "red" ? "#ff6b66" : c === "blue" ? "#93c5fd" : "#f0d878";

  const px = (n: number, axis: "w" | "h") => n * (axis === "w" ? natSize.w : natSize.h);

  // every bookable spot from every zone stays on the map at all zoom levels
  const flatSpots = layout.areas.flatMap((z) =>
    z.tables?.length
      ? z.tables.map((t) => ({ spot: t, zone: z, isZoneItself: false }))
      : [{ spot: z as TableSpot, zone: z, isZoneItself: true }]
  );

  return (
    <div>
      {/* legend */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_6px] shadow-green-500" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> Sold out
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gold" /> Unavailable
        </span>
      </div>

      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        className="relative h-[62vh] max-h-[720px] min-h-[360px] cursor-grab touch-none select-none overflow-hidden rounded-md bg-coal active:cursor-grabbing"
      >
        {/* controls */}
        <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
          {zone && (
            <button
              onClick={backToOverview}
              className="flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-coal shadow-lg shadow-black/40 transition-transform hover:scale-105"
            >
              ← Overview
            </button>
          )}
        </div>
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
          <button
            onClick={() => zoomButton(1)}
            aria-label="Zoom in"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-lg font-semibold text-coal shadow-lg shadow-black/40 transition-transform hover:scale-105"
          >
            +
          </button>
          <button
            onClick={() => zoomButton(-1)}
            aria-label="Zoom out"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-lg font-semibold text-coal shadow-lg shadow-black/40 transition-transform hover:scale-105"
          >
            −
          </button>
          <button
            onClick={() => (zone ? focusBounds(boundsForZone(zone)) : fit())}
            aria-label="Reset view"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-xs font-semibold text-coal shadow-lg shadow-black/40 transition-transform hover:scale-105"
          >
            ⤢
          </button>
        </div>

        {/* transformed layer (image + polygons + pins) */}
        <div
          ref={layerRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: natSize.w || "100%", height: natSize.h || "auto", ["--s" as string]: "1" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={layout.sceneimageurl}
            alt=""
            onLoad={onImgLoad}
            className="pointer-events-none block h-full w-full select-none"
            draggable={false}
          />

          {/* zone polygons — clickable in overview (tap anywhere in the area) */}
          {natSize.w > 0 && (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${natSize.w} ${natSize.h}`}
              preserveAspectRatio="none"
            >
              {layout.areas.map((z) => {
                if (!z.outlinePolygon || z.outlinePolygon.length < 3) return null;
                const pts = z.outlinePolygon.map((p) => `${px(p.x, "w")},${px(p.y, "h")}`).join(" ");
                const focused = zone?._id === z._id;
                const hasSel = zonesWithSelection.has(z._id);
                const clickable = z.selectable !== false && !!z.tables?.length;
                return (
                  <polygon
                    key={z._id}
                    points={pts}
                    onClick={() => {
                      if (dragged.current) return;
                      if (clickable) focusZone(z);
                    }}
                    className={clickable ? "cursor-pointer transition-all" : ""}
                    fill={
                      focused
                        ? "rgba(34,197,94,0.10)"
                        : hasSel
                          ? "rgba(34,197,94,0.12)"
                          : clickable
                            ? "rgba(245,245,240,0.02)"
                            : "transparent"
                    }
                    stroke={
                      focused
                        ? "#22c55e"
                        : hasSel
                          ? "rgba(34,197,94,0.7)"
                          : "rgba(245,245,240,0.28)"
                    }
                    strokeWidth={focused ? 2.5 : 1.5}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: clickable ? "auto" : "none" }}
                  />
                );
              })}
            </svg>
          )}

          {/* pins — every table on the map; the focused zone's are emphasised */}
          {natSize.w > 0 &&
            flatSpots.map(({ spot, zone: z, isZoneItself }) => {
              const isSel = selectedSet.has(spot._id);
              const clickable = spot.selectable !== false;
              const inFocus = zone?._id === z._id;
              const color = pinColor(spot.pinColor);
              const top = pinTop(spot.pinColor);
              const available = spot.pinColor === "green";
              // labels only where it matters — focused zone (or a selection) —
              // so the map isn't buried under 50 price tags
              const showLabel = (inFocus || isSel) && (available || isSel);
              const emphasised = inFocus || isSel;

              return (
                <button
                  key={spot._id}
                  disabled={!clickable}
                  onClick={() => {
                    if (dragged.current) return;
                    if (isZoneItself && z.tables?.length) focusZone(z);
                    else {
                      setZoneId(z._id); // light up the whole zone…
                      onToggle(z, spot); // …and toggle this table
                    }
                  }}
                  className="group absolute p-2.5"
                  style={{
                    left: px(spot.hotspot.x, "w"),
                    top: px(spot.hotspot.y, "h"),
                    transform: "translate(-50%, -50%) scale(calc(1 / var(--s, 1)))",
                    transformOrigin: "center",
                    zIndex: emphasised ? 3 : 1,
                  }}
                  aria-label={spot.label}
                >
                  <span className="relative flex items-center justify-center">
                    {/* pulsing ring on selected */}
                    {isSel && (
                      <span
                        className="absolute inline-flex h-8 w-8 animate-ping rounded-full border-2 opacity-70"
                        style={{ borderColor: color }}
                      />
                    )}
                    {/* soft glow halo */}
                    <span
                      className="absolute rounded-full blur-[3px] transition-all duration-300"
                      style={{
                        width: emphasised ? 26 : 16,
                        height: emphasised ? 26 : 16,
                        background: color,
                        opacity: available ? (emphasised ? 0.55 : 0.3) : 0.25,
                      }}
                    />
                    {/* glossy bead */}
                    <span
                      className="relative block rounded-full transition-all duration-300 group-hover:scale-110"
                      style={{
                        width: isSel ? 22 : emphasised ? 17 : 13,
                        height: isSel ? 22 : emphasised ? 17 : 13,
                        background: `radial-gradient(circle at 34% 28%, ${top} 0%, ${color} 55%, ${color} 100%)`,
                        border: isSel ? "2px solid #f5f5f0" : "1.5px solid rgba(255,255,255,0.85)",
                        boxShadow: isSel
                          ? `0 4px 10px rgba(0,0,0,0.5), 0 0 18px 3px ${color}`
                          : `0 2px 5px rgba(0,0,0,0.55), 0 0 8px ${color}88`,
                        opacity: clickable ? 1 : 0.55,
                      }}
                    />
                    {isSel && (
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute h-3 w-3 text-coal"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                      >
                        <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>

                  {/* label */}
                  {showLabel && (
                    <span
                      className={`pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-wide ${
                        isSel ? "bg-green-500 text-coal" : "bg-coal/92 text-cream"
                      }`}
                      style={{ boxShadow: "0 3px 10px rgba(0,0,0,0.5)" }}
                    >
                      {isZoneItself && !z.tables?.length ? (
                        <>
                          {spot.label}
                          {spot.tablesLeft ? ` · ${spot.tablesLeft} left` : ""}
                        </>
                      ) : (
                        <>
                          From {inr(spot.priceFromPerPerson)}/pax · {spot.maxPartySize} pax
                        </>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        {/* loader — spinner over a shimmer until the plan is measured & framed */}
        {!ready && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface via-coal to-surface" />
            <div className="relative h-10 w-10">
              <span className="absolute inset-0 rounded-full border-2 border-line" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
            </div>
            <p className="label relative !text-muted">Loading floor plan…</p>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        {zone
          ? "Tap a table to select · drag to pan · pinch or scroll to zoom"
          : "Tap an area to open it · drag to pan · pinch or scroll to zoom"}
      </p>
    </div>
  );
}
