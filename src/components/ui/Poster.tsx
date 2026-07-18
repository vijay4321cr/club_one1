import Image from "next/image";

interface Props {
  hue: number;
  initials: string;
  /** real artwork path under /public — falls back to generated placeholder */
  src?: string;
  alt?: string;
  /** eager-load (set on above-the-fold/LCP candidates) */
  priority?: boolean;
  className?: string;
}

/**
 * Event artwork. Renders the real poster when `src` is provided, otherwise a
 * deterministic gradient + grain + cropped-initials placeholder.
 */
export default function Poster({
  hue,
  initials,
  src,
  alt = "",
  priority = false,
  className = "",
}: Props) {
  if (src) {
    return (
      <div className={`noise relative overflow-hidden bg-surface ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
          className="object-cover object-top"
        />
        {/* hue shade + bottom fade — matches the placeholder theme */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(130% 110% at 15% 0%, hsl(${hue} 75% 30% / 0.22) 0%, transparent 55%), linear-gradient(to top, hsl(${hue} 60% 6% / 0.45) 0%, transparent 40%)`,
          }}
        />
        <span
          aria-hidden
          className="h-display absolute -bottom-[0.18em] -right-[0.05em] select-none leading-none text-cream/20 mix-blend-overlay"
          style={{ fontSize: "9rem" }}
        >
          {initials}
        </span>
        <span
          aria-hidden
          className="absolute left-3 top-3 h-2 w-2 rounded-full"
          style={{ background: `hsl(${hue} 90% 55%)` }}
        />
      </div>
    );
  }

  return (
    <div
      className={`noise relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(130% 110% at 15% 0%, hsl(${hue} 75% 26%) 0%, hsl(${hue} 70% 12%) 45%, #0d0d0d 100%)`,
      }}
    >
      <span
        aria-hidden
        className="h-display absolute -bottom-[0.18em] -right-[0.05em] select-none leading-none text-cream/[0.07]"
        style={{ fontSize: "9rem" }}
      >
        {initials}
      </span>
      <span
        aria-hidden
        className="absolute left-3 top-3 h-2 w-2 rounded-full"
        style={{ background: `hsl(${hue} 90% 55%)` }}
      />
    </div>
  );
}
