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

  /* image load → measure, fit */
  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    nat.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
    fit();
    setReady(true);
  };

  /* refit on resize while in overview */
  useEffect(() => {
    const onResize = () => {
      if (!zoneId) fit();
      else if (zone?.focusBounds) focusBounds(zone.focusBounds);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [zoneId, zone, fit, focusBounds]);

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

  const openZone = (z: TableZone) => {
    setZoneId(z._id);
    if (z.focusBounds) requestAnimationFrame(() => focusBounds(z.focusBounds!));
  };
  const backToOverview = () => {
    setZoneId(null);
    requestAnimationFrame(() => fit());
  };

  const pinColor = (c: string) =>
    c === "green" ? "#22c55e" : c === "red" ? "#e10600" : c === "blue" ? "#3b82f6" : "#c9a227";

  const px = (n: number, axis: "w" | "h") => n * (axis === "w" ? nat.current.w : nat.current.h);

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
            onClick={() => (zone?.focusBounds ? focusBounds(zone.focusBounds) : fit())}
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
          style={{ width: nat.current.w || "100%", height: nat.current.h || "auto", ["--s" as string]: "1" }}
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
          {nat.current.w > 0 && (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${nat.current.w} ${nat.current.h}`}
              preserveAspectRatio="none"
            >
              {layout.areas.map((z) => {
                if (!z.outlinePolygon || z.outlinePolygon.length < 3) return null;
                const pts = z.outlinePolygon.map((p) => `${px(p.x, "w")},${px(p.y, "h")}`).join(" ");
                const focused = zone?._id === z._id;
                const hasSel = zonesWithSelection.has(z._id);
                const clickable = !zone && z.selectable !== false;
                return (
                  <polygon
                    key={z._id}
                    points={pts}
                    onClick={() => {
                      if (dragged.current) return;
                      if (!zone && z.tables?.length) openZone(z);
                    }}
                    className={clickable ? "cursor-pointer" : ""}
                    fill={
                      focused
                        ? "rgba(245,245,240,0.05)"
                        : hasSel
                          ? "rgba(34,197,94,0.14)"
                          : clickable
                            ? "rgba(245,245,240,0.03)"
                            : "transparent"
                    }
                    stroke={focused ? "rgba(245,245,240,0.95)" : hasSel ? "#22c55e" : "rgba(245,245,240,0.35)"}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: zone ? "none" : "auto" }}
                  />
                );
              })}
            </svg>
          )}

          {/* pins */}
          {nat.current.w > 0 &&
            (() => {
              const spots: (TableSpot & { isZone?: boolean; zoneRef?: TableZone })[] = zone
                ? (zone.tables?.length ? zone.tables : [{ ...zone }]).map((t) => ({ ...t, zoneRef: zone }))
                : layout.areas.map((z) => ({ ...z, isZone: true }));
              return spots.map((s) => {
                const isSel = s.isZone ? zonesWithSelection.has(s._id) : selectedSet.has(s._id);
                const clickable = s.selectable !== false;
                const color = pinColor(s.pinColor);
                const showPrice = !s.isZone && s.pinColor === "green";
                return (
                  <button
                    key={s._id}
                    disabled={!clickable && !s.isZone}
                    onClick={() => {
                      if (dragged.current) return;
                      if (s.isZone && s.tables?.length) openZone(s as TableZone);
                      else if (zone) onToggle(zone, s);
                    }}
                    className="absolute p-3"
                    style={{
                      left: px(s.hotspot.x, "w"),
                      top: px(s.hotspot.y, "h"),
                      transform: "translate(-50%, -50%) scale(calc(1 / var(--s, 1)))",
                      transformOrigin: "center",
                    }}
                    aria-label={s.label}
                  >
                    <span className="relative flex items-center justify-center">
                      {isSel && (
                        <span
                          className="absolute h-9 w-9 animate-ping rounded-full opacity-60"
                          style={{ backgroundColor: color }}
                        />
                      )}
                      <span
                        className="block rounded-full transition-transform group-hover:scale-110"
                        style={{
                          backgroundColor: color,
                          width: isSel ? 22 : 15,
                          height: isSel ? 22 : 15,
                          boxShadow: isSel
                            ? `0 0 0 3px #f5f5f0, 0 0 16px 3px ${color}`
                            : `0 0 0 2px rgba(13,13,13,0.9), 0 0 10px 1px ${color}aa`,
                          opacity: clickable || s.isZone ? 1 : 0.65,
                        }}
                      />
                      {isSel && (
                        <span className="absolute text-[11px] font-bold text-coal">✓</span>
                      )}
                    </span>

                    {/* label */}
                    <span
                      className={`pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-wide backdrop-blur-sm ${
                        isSel ? "bg-green-500 text-coal" : "bg-coal/90 text-cream"
                      }`}
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                    >
                      {s.isZone ? (
                        <>
                          {s.label}
                          {s.tablesLeft ? ` · ${s.tablesLeft} left` : ""}
                        </>
                      ) : showPrice ? (
                        <>
                          From {inr(s.priceFromPerPerson)}/pax · {s.maxPartySize} pax
                        </>
                      ) : (
                        s.label
                      )}
                    </span>
                  </button>
                );
              });
            })()}
        </div>

        {!ready && <div className="absolute inset-0 animate-pulse bg-surface" />}
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        {zone
          ? "Tap a table to select · drag to pan · pinch or scroll to zoom"
          : "Tap an area to open it · drag to pan · pinch or scroll to zoom"}
      </p>
    </div>
  );
}
