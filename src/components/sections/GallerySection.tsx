import type { GalleryItem } from "@/types";
import Poster from "@/components/ui/Poster";
import FxReveal from "@/components/ui/FxReveal";
import SectionHeading from "@/components/ui/SectionHeading";

const ratios: Record<GalleryItem["ratio"], string> = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  wide: "aspect-[16/10]",
};

/**
 * Gallery grid. Currently mock items via lib/api — swap the data source for
 * the Instagram Graph API feed (or an embed widget) once that's decided
 * with the client & backend dev.
 */
export default function GallerySection({ items }: { items: GalleryItem[] }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <SectionHeading
        label="From the floor"
        title="Gallery"
        right={<span className="font-serif text-xl italic text-muted">as seen on @2bhk</span>}
      />
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
        {items.map((g, i) => (
          <FxReveal
            key={g.id}
            effect="burn"
            delay={(i % 4) * 0.09}
            className="break-inside-avoid overflow-hidden rounded-sm"
          >
            <figure className="group relative overflow-hidden rounded-sm">
              <Poster
                hue={g.hue}
                initials="✦"
                src={g.image}
                alt={g.caption}
                className={`w-full transition-transform duration-700 group-hover:scale-[1.05] ${ratios[g.ratio]}`}
              />
              <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-coal/90 to-transparent p-4 pt-10 text-xs text-cream/90 opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                {g.caption}
              </figcaption>
            </figure>
          </FxReveal>
        ))}
      </div>
    </section>
  );
}
