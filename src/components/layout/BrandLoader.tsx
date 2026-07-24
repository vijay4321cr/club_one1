import Image from "next/image";

/** Blinking 2BHK mark used while a section's heavy content (e.g. the floor map) loads. */
export default function BrandLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Image
        src="/logo.png"
        alt="2BHK"
        width={100}
        height={125}
        priority
        className="h-16 w-auto animate-pulse md:h-20"
      />
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
        {label && <p className="label !text-[0.5625rem] !text-muted">{label}</p>}
      </div>
    </div>
  );
}
