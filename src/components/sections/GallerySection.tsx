import type { GalleryItem } from "@/types";
import Gallery3D from "@/components/sections/Gallery3D";
import SectionHeading from "@/components/ui/SectionHeading";

/**
 * Gallery — 3D ring carousel (three.js + GSAP), flat grid fallback for
 * reduced-motion / no-WebGL. Stock items for now; swap the data source in
 * lib/data/content.ts when the club's own media arrives.
 */
export default function GallerySection({ items }: { items: GalleryItem[] }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <SectionHeading
        label="From the floor"
        title="Gallery"
        right={<span className="font-serif text-xl italic text-muted">as seen on @2bhkdinerkeyclub</span>}
      />
      <Gallery3D items={items} />
    </section>
  );
}
