"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Image as DreiImage } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Poster from "@/components/ui/Poster";
import FxReveal from "@/components/ui/FxReveal";

export interface RingItem {
  id: string;
  image?: string;
  caption: string;
  hue?: number;
}

interface Control {
  value: number;
  target: number;
  dragging: boolean;
  lastX: number;
}

interface RingProps {
  items: RingItem[];
  entrance: React.MutableRefObject<{ p: number }>;
  onFront: (i: number) => void;
}

/** Tilted ring of image planes — auto-spins, eased toward drag target. */
function Ring({ items, entrance, onFront }: RingProps) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const viewport = useThree((s) => s.viewport);
  const control = useRef<Control>({ value: 0, target: 0, dragging: false, lastX: 0 });
  const lastFront = useRef(-1);
  const step = (Math.PI * 2) / items.length;

  // drag-to-spin on the canvas; vertical touch still scrolls (touch-action: pan-y)
  useEffect(() => {
    const el = gl.domElement;
    const c = control.current;
    const down = (e: globalThis.PointerEvent) => {
      c.dragging = true;
      c.lastX = e.clientX;
    };
    const move = (e: globalThis.PointerEvent) => {
      if (!c.dragging) return;
      c.target += (e.clientX - c.lastX) * 0.006;
      c.lastX = e.clientX;
    };
    const up = () => {
      c.dragging = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const c = control.current;
    const d = Math.min(delta, 1 / 30); // clamp so a dropped frame can't jump the ring
    if (!c.dragging) c.target += d * 0.14; // slow auto-rotation
    c.value += (c.target - c.value) * Math.min(1, d * 6);

    const g = group.current;
    if (!g) return;
    // responsive: shrink the ring on narrow viewports
    const base = Math.min(1, Math.max(0.5, viewport.width / 8));
    const s = base * (0.82 + 0.18 * entrance.current.p);
    g.scale.setScalar(s);
    g.rotation.y = c.value + (1 - entrance.current.p) * -1.3;

    const idx = ((Math.round(-c.value / step) % items.length) + items.length) % items.length;
    if (idx !== lastFront.current) {
      lastFront.current = idx;
      onFront(idx);
    }
  });

  return (
    <group rotation={[0.16, 0, -0.07]}>
      <group ref={group}>
        {items.map((g, i) => (
          <group
            key={g.id}
            position={[Math.sin(i * step) * 2.7, 0, Math.cos(i * step) * 2.7]}
            rotation={[0, i * step, i % 2 ? 0.05 : -0.05]}
          >
            {g.image && (
              <DreiImage
                url={g.image}
                scale={[1.5, 1.9]}
                radius={0.08}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            )}
          </group>
        ))}
      </group>
    </group>
  );
}

/** Reusable 3D image-ring carousel (three.js + GSAP), flat-grid fallback. */
export default function Ring3D({ items }: { items: RingItem[] }) {
  const imgs = items.filter((g) => g.image);
  const [front, setFront] = useState(0);
  const [mode, setMode] = useState<"3d" | "flat" | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const entrance = useRef({ p: 0 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      const ctx = (c.getContext("webgl2") ||
        c.getContext("webgl")) as WebGLRenderingContext | null;
      webgl = !!ctx;
      // release the probe context immediately — leaking WebGL contexts
      // (esp. across dev fast-refresh) exhausts the browser's pool and makes
      // later detections falsely return "no WebGL" → flat fallback
      ctx?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl = false;
    }
    setMode(reduced || !webgl ? "flat" : "3d");
  }, []);

  useEffect(() => {
    if (mode !== "3d" || !wrapRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        entrance.current,
        { p: 0 },
        {
          p: 1,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: { trigger: wrapRef.current, start: "top 80%", once: true },
        }
      );
    });
    return () => ctx.revert();
  }, [mode]);

  if (mode === null) return <div className="h-[320px] md:h-[440px]" />;

  /* fallback: compact flat grid */
  if (mode === "flat") {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {imgs.slice(0, 8).map((g, i) => (
          <FxReveal key={g.id} effect="burn" delay={(i % 4) * 0.08} className="overflow-hidden rounded-sm">
            <figure>
              <Poster hue={g.hue ?? 350} initials="✦" src={g.image} alt={g.caption} className="aspect-[3/4] w-full" />
              <figcaption className="label mt-2 !text-[0.5625rem]">{g.caption}</figcaption>
            </figure>
          </FxReveal>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div
        ref={wrapRef}
        className="ring3d relative h-[320px] cursor-grab select-none active:cursor-grabbing md:h-[440px]"
      >
        <Canvas camera={{ position: [0, 0, 6.2], fov: 38 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
          <Suspense fallback={null}>
            <Ring items={imgs} entrance={entrance} onFront={setFront} />
          </Suspense>
        </Canvas>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-coal to-transparent md:w-24" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-coal to-transparent md:w-24" />
      </div>

      <div className="mt-3 flex flex-col items-center gap-1 text-center">
        <p className="font-display text-sm font-medium uppercase tracking-wide md:text-base">
          {imgs[front]?.caption}
        </p>
        <p className="label !text-[0.5625rem]">
          {String(front + 1).padStart(2, "0")} / {String(imgs.length).padStart(2, "0")} · drag to spin
        </p>
      </div>
    </div>
  );
}
