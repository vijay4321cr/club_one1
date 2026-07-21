"use client";

import { useState } from "react";
import type { TableLayout, TableZone, TableSpot } from "@/types";

interface Props {
  layout: TableLayout;
  selectedIds: string[];
  onToggle: (zone: TableZone, table: TableSpot) => void;
}

const pinClass = (color: string) =>
  color === "green"
    ? "bg-green-500"
    : color === "red"
      ? "bg-primary"
      : color === "blue"
        ? "bg-blue-500"
        : "bg-gold";

/** Interactive floor plan — zone overview → zoom into a zone → pick a table. */
export default function FloorMap({ layout, selectedIds, onToggle }: Props) {
  const [zoneId, setZoneId] = useState<string | null>(null);
  const zone = layout.areas.find((z) => z._id === zoneId) ?? null;
  const selectedSet = new Set(selectedIds);
  // zones that contain a selected table (for an overview indicator)
  const zonesWithSelection = new Set(
    layout.areas
      .filter((z) => z.tables?.some((t) => selectedSet.has(t._id)))
      .map((z) => z._id)
  );

  // scale to frame a zone's focusBounds into the viewport (origin top-left)
  const zoomScale = (() => {
    if (!zone?.focusBounds) return 1;
    const { xMin, yMin, xMax, yMax } = zone.focusBounds;
    const bw = Math.max(0.05, xMax - xMin);
    const bh = Math.max(0.05, yMax - yMin);
    return Math.min(1 / bw, 1 / bh) * 0.92;
  })();

  const transform = (() => {
    if (!zone?.focusBounds || zoomScale === 1) return "none";
    const { xMin, yMin, xMax, yMax } = zone.focusBounds;
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    const tx = (0.5 - cx * zoomScale) * 100;
    const ty = (0.5 - cy * zoomScale) * 100;
    return `translate(${tx}%, ${ty}%) scale(${zoomScale})`;
  })();

  // counter-scale pins so they stay a constant on-screen size at any zoom
  const pinScale = 1 / zoomScale;

  const spots: (TableSpot & { isZone?: boolean })[] = zone
    ? zone.tables && zone.tables.length > 0
      ? zone.tables
      : [{ ...zone, isZone: true }]
    : layout.areas.map((z) => ({ ...z, isZone: true }));

  return (
    <div>
      {/* legend */}
      <div className="mb-3 flex items-center justify-end gap-4 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
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

      <div className="relative overflow-hidden rounded-sm bg-coal">
        {/* zoom-out control — prominent light pill */}
        {zone && (
          <button
            onClick={() => setZoneId(null)}
            className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-coal shadow-lg shadow-black/40 transition-transform hover:scale-105"
          >
            <span className="text-sm leading-none">⤢</span> Zoom out
          </button>
        )}

        {/* scene + pins transform together as one layer */}
        <div className="origin-top-left transition-transform duration-500 ease-out" style={{ transform }}>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={layout.sceneimageurl}
              alt=""
              className="pointer-events-none block h-auto w-full select-none"
              draggable={false}
            />

            {/* focused zone outline (white boundary, like the reference) */}
            {zone?.outlinePolygon && zone.outlinePolygon.length > 2 && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <polygon
                  points={zone.outlinePolygon.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
                  fill="rgba(245,245,240,0.05)"
                  stroke="rgba(245,245,240,0.95)"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}

            {spots.map((s) => {
              const isSel = s.isZone
                ? zonesWithSelection.has(s._id)
                : selectedSet.has(s._id);
              const clickable = s.selectable !== false;
              return (
                <button
                  key={s._id}
                  disabled={!clickable}
                  onClick={() => {
                    if (s.isZone && "tables" in s && (s as TableZone).tables?.length) {
                      setZoneId(s._id);
                    } else if (zone) {
                      onToggle(zone, s);
                    } else {
                      onToggle(s as TableZone, s);
                    }
                  }}
                  className="group absolute"
                  style={{
                    left: `${s.hotspot.x * 100}%`,
                    top: `${s.hotspot.y * 100}%`,
                    // center on the point, then counter-scale to stay small
                    transform: `translate(-50%, -50%) scale(${pinScale})`,
                    transformOrigin: "center",
                  }}
                  aria-label={s.label}
                >
                  <span className="relative flex items-center justify-center">
                    {/* glow ring when selected */}
                    {isSel && (
                      <span
                        className={`absolute h-8 w-8 animate-ping rounded-full opacity-60 ${pinClass(
                          s.pinColor
                        )}`}
                      />
                    )}
                    <span
                      className={`block rounded-full ring-2 transition-transform ${pinClass(
                        s.pinColor
                      )} ${
                        isSel
                          ? "h-5 w-5 ring-cream shadow-[0_0_12px_2px_rgba(245,245,240,0.7)]"
                          : "h-3.5 w-3.5 ring-coal"
                      } ${clickable ? "group-hover:scale-125" : "opacity-70"}`}
                    />
                  </span>
                  {/* label chip */}
                  <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-sm bg-coal/85 px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase tracking-wide text-cream/90 backdrop-blur-sm">
                    {s.label}
                    {s.isZone && s.tablesLeft ? ` · ${s.tablesLeft} left` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        {zone
          ? "Tap an available table to select it."
          : "Tap a zone to zoom in and pick your table."}
      </p>
    </div>
  );
}
