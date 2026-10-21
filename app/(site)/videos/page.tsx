import type { Metadata } from "next";
import { getVideos } from "@/lib/cms";
import { socials } from "@/data/social";
import { PageHero } from "@/components/ui/PageHero";
import { VideoGrid } from "@/components/video/VideoGrid";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Videos",
  description: "Feel the energy — Bombita aftermovies, DJ sets and live performances from New York City.",
  alternates: { canonical: "/videos" },
};

export default async function VideosPage() {
  const videos = await getVideos();
  const youtube = socials.find((s) => s.network === "youtube");
  return (
    <>
      <PageHero
        eyebrow="Videos"
        title="Feel the"
        accent="energy."
        intro="Aftermovies, sets and live moments. Turn the sound up."
        image="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=2200&q=75&auto=format&fit=crop"
      />
      <section aria-label="Videos" className="container-lux py-16 md:py-24">
        <VideoGrid videos={videos} />
        {youtube && (
          <div className="mt-20 flex flex-col items-center gap-6 border-t border-white/10 pt-16 text-center">
            <p className="font-serif text-2xl italic text-white/85 md:text-3xl">Full sets and aftermovies on YouTube.</p>
            <Button href={youtube.url} variant="outline" size="lg">
              Subscribe {youtube.handle}
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
