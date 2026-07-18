import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

/** Infinite auto-scrolling strip (content is duplicated for the loop). */
export default function Marquee({ children, className = "" }: Props) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex w-max animate-marquee items-center">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
