"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import gsap from "gsap";
import TransitionLink from "@/components/ui/TransitionLink";

type Variant = "primary" | "outline" | "gold" | "ghost";

interface Props {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-cream hover:bg-cream hover:text-coal",
  outline:
    "border border-line text-cream hover:border-cream hover:bg-cream hover:text-coal",
  gold: "bg-gold text-coal hover:bg-cream",
  ghost: "text-cream hover:text-primary",
};

/** Pill button with a subtle magnetic pull on fine pointers. */
export default function Button({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
  full,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  const magnet = (e: MouseEvent) => {
    const el = ref.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    const r = el.getBoundingClientRect();
    gsap.to(el, {
      x: (e.clientX - r.left - r.width / 2) * 0.25,
      y: (e.clientY - r.top - r.height / 2) * 0.35,
      duration: 0.4,
      ease: "power3.out",
    });
  };
  const reset = () => {
    if (ref.current) gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
  };

  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] transition-colors duration-300 select-none ${
    variants[variant]
  } ${disabled ? "pointer-events-none opacity-40" : ""} ${full ? "w-full" : ""} ${className}`;

  const inner = (
    <span ref={ref} className="pointer-events-none block">
      {children}
    </span>
  );

  if (href) {
    return (
      <TransitionLink href={href} className={cls} onMouseMove={magnet} onMouseLeave={reset}>
        {inner}
      </TransitionLink>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cls}
      onMouseMove={magnet}
      onMouseLeave={reset}
    >
      {inner}
    </button>
  );
}
