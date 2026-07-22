import HeroLive from "@/components/events/HeroLive";
import UpcomingGrid from "@/components/events/UpcomingGrid";
import PastEvents from "@/components/sections/PastEvents";
import PartnersMarquee from "@/components/sections/PartnersMarquee";
import Offers from "@/components/sections/Offers";
import GallerySection from "@/components/sections/GallerySection";
import SocialStrip from "@/components/sections/SocialStrip";
import Faq from "@/components/sections/Faq";
import { getPastEvents, getGallery } from "@/lib/api";

export default async function HomePage() {
  const [past, galleryItems] = await Promise.all([getPastEvents(), getGallery()]);

  return (
    <>
      <HeroLive />

      {/* upcoming + ongoing events — live from the box office */}
      <section id="events" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-12 md:px-8 md:py-16">
        <UpcomingGrid
          label="On the calendar"
          title={
            <>
              Upcoming
              <br />
              Events
            </>
          }
        />
      </section>

      <PastEvents events={past} />
      <PartnersMarquee />
      <Offers />
      <GallerySection items={galleryItems} />
      <SocialStrip />
      <Faq />
    </>
  );
}
