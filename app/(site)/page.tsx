import { getFeaturedEvent, getUpcomingEvents } from "@/lib/cms";
import { getProducts } from "@/lib/shop";
import { Hero } from "@/components/hero/Hero";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { JoinSection } from "@/components/home/JoinSection";
import { EventsSection } from "@/components/events/EventsSection";
import { ExperienceVideo } from "@/components/video/ExperienceVideo";
import { WearFeature } from "@/components/wear/WearFeature";
import { SocialSection } from "@/components/home/SocialSection";
import { VideoWall } from "@/components/video/VideoWall";
import { isDatabaseConfigured } from "@/lib/db";
import { galleryFacets, listPublished } from "@/lib/media/queries";
import { log } from "@/lib/log";
import type { TilePhoto } from "@/components/home/CategoryTiles";

/** Up to 4 real gallery photos for the Photos tile, spread across the latest albums. Never throws. */
async function photoPreviews(): Promise<TilePhoto[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const nights = (await galleryFacets()).dates.filter((d) => d.images > 0).slice(0, 4);
    const pages = await Promise.all(nights.map((d) => listPublished({ date: d.date, type: "image" }, { limit: nights.length === 1 ? 4 : 2 })));
    const picked: TilePhoto[] = [];
    // Round-robin so each recent night is represented before repeating one.
    for (let i = 0; picked.length < 4 && pages.some((p) => p.items[i]); i++) {
      for (const p of pages) {
        const it = p.items[i];
        if (!it || picked.length >= 4) continue;
        const display = it.display ?? it.thumb;
        picked.push({
          src: display.url,
          srcSet: [it.thumb.w && `${it.thumb.url} ${it.thumb.w}w`, it.display?.w && `${it.display.url} ${it.display.w}w`].filter(Boolean).join(", ") || undefined,
          alt: it.title ?? it.caption ?? "Bombita Party night",
        });
      }
    }
    return picked;
  } catch (err) {
    log.warn("home.photo_previews_failed", { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/** Re-render hourly so past events roll off; admin edits revalidate instantly. */
export const revalidate = 300;

export default async function Home() {
  const [featured, upcoming, products, photos] = await Promise.all([getFeaturedEvent(), getUpcomingEvents(), getProducts(), photoPreviews()]);

  return (
    <>
      <Hero nextEvent={featured} />
      <EventsSection upcoming={upcoming} />
      <CategoryTiles photos={photos} />
      <WearFeature products={products} />
      <ExperienceVideo />
      <SocialSection />
      <JoinSection />
      <VideoWall />
    </>
  );
}
