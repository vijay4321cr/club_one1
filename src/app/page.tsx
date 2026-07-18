import Hero from "@/components/hero/Hero";
import RizztixEventCard from "@/components/events/RizztixEventCard";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import PastEvents from "@/components/sections/PastEvents";
import PartnersMarquee from "@/components/sections/PartnersMarquee";
import Offers from "@/components/sections/Offers";
import GallerySection from "@/components/sections/GallerySection";
import SocialStrip from "@/components/sections/SocialStrip";
import Faq from "@/components/sections/Faq";
import { getPastEvents, getGallery, getRizztixUpcomingEvents } from "@/lib/api";

export const revalidate = 60;

export default async function HomePage() {
  const [{ events: upcoming, totalCount }, past, galleryItems] = await Promise.all([
    getRizztixUpcomingEvents(),
    getPastEvents(),
    getGallery(),
  ]);

  return (
    <>
      <Hero nextEvent={upcoming[0]} />

      {/* upcoming + ongoing events — live from the box office */}
      <section id="events" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
        <SectionHeading
          label="On the calendar"
          title={
            <>
              Upcoming
              <br />
              Events
            </>
          }
          right={
            upcoming.length > 0 ? (
              <span className="font-serif text-xl italic text-muted">
                {totalCount} on sale now
              </span>
            ) : undefined
          }
        />
        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e, i) => (
              <Reveal key={e._id} delay={(i % 3) * 0.08}>
                <RizztixEventCard event={e} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="rounded-sm border border-line p-10 text-center md:p-16">
              <p className="h-display text-2xl md:text-3xl">New nights announced soon.</p>
              <p className="mt-3 text-sm text-muted">
                Follow us on Instagram or join the newsletter below to hear first.
              </p>
            </div>
          </Reveal>
        )}
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
