import { getFeaturedEvent, getUpcomingEvents } from "@/lib/cms";
import { getProducts } from "@/lib/shop";
import { Hero } from "@/components/hero/Hero";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { JoinSection } from "@/components/home/JoinSection";
import { EventsSection } from "@/components/events/EventsSection";
import { ExperienceVideo } from "@/components/video/ExperienceVideo";
import { HomeGallery } from "@/components/gallery/HomeGallery";
import { WearFeature } from "@/components/wear/WearFeature";
import { SocialSection } from "@/components/home/SocialSection";
import { VideoWall } from "@/components/video/VideoWall";

/** Re-render hourly so past events roll off; admin edits revalidate instantly. */
export const revalidate = 300;

export default async function Home() {
  const [featured, upcoming, products] = await Promise.all([getFeaturedEvent(), getUpcomingEvents(), getProducts()]);

  return (
    <>
      <Hero nextEvent={featured} />
      <EventsSection upcoming={upcoming} />
      <CategoryTiles />
      <HomeGallery />
      <WearFeature products={products} />
      <ExperienceVideo />
      <SocialSection />
      <JoinSection />
      <VideoWall />
    </>
  );
}
