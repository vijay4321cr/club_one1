import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import MenuView from "@/components/menu/MenuView";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "The 2BHK menu — a world tour of comfort-cuisine zones from the Hauté kitchen, plus the full bar & mixology list.",
};

export default function MenuPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <Reveal>
        <p className="label mb-3 text-center">Bar ‹Hauté› Kitchen</p>
        <h1 className="h-display !normal-case text-center text-5xl md:text-7xl">
          The Menu<span className="text-primary">.</span>
        </h1>
      </Reveal>

      <div className="mt-12">
        <MenuView />
      </div>
    </div>
  );
}
