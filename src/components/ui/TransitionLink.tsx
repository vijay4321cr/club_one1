"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useTransitionNav } from "@/components/layout/PageTransition";

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  /** called just before navigation starts (e.g. close the menu) */
  onNavigate?: () => void;
}

/** Internal link that routes through the GSAP curtain transition. */
export default function TransitionLink({ href, children, onNavigate, onClick, ...rest }: Props) {
  const navigate = useTransitionNav();
  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        onNavigate?.();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
