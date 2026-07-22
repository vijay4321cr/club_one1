import type { ReactNode } from "react";
import Reveal from "@/components/ui/Reveal";

interface Props {
  label: string;
  title: ReactNode;
  right?: ReactNode;
  className?: string;
}

export default function SectionHeading({ label, title, right, className = "" }: Props) {
  return (
    <Reveal className={`mb-7 md:mb-9 ${className}`}>
      <div className="flex items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="label mb-3">{label}</p>
          <h2 className="h-display text-4xl md:text-6xl lg:text-7xl">{title}</h2>
        </div>
        {right && <div className="hidden shrink-0 md:block">{right}</div>}
      </div>
    </Reveal>
  );
}
