import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { bombita, img } from "@/data/media";
import { socials } from "@/data/social";
import { Button } from "@/components/ui/Button";
import { BrushUnderline } from "@/components/ui/Logo";
import { ImageReveal, SplitReveal } from "@/components/animations/Reveal";
import { GalleryGate } from "@/components/gallery/GalleryGate";
import { NightAlbums } from "@/components/gallery/NightAlbums";
import { isMember } from "@/lib/member";
import { isDatabaseConfigured } from "@/lib/db";
import { galleryFacets, listPublished } from "@/lib/media/queries";
import { getAllEvents } from "@/lib/cms";
import { log } from "@/lib/log";
import type { GalleryAlbum, GalleryFacets } from "@/lib/media/types";
import type { BombitaEvent } from "@/lib/cms/types";

export const metadata: Metadata = {
  title: "Event Gallery",
  description: "Real people. Real vibes. Real Bombita. Photo recaps from every Bombita night in New York City — pick a night, open the album.",
  alternates: { canonical: "/photos" },
};

function Unavailable() {
  return (
    <div role="alert" className="flex flex-col items-center border border-white/10 px-6 py-16 text-center">
      <AlertTriangle className="h-7 w-7 text-gold-300" aria-hidden />
      <p className="mt-4 font-display text-4xl tracking-wide">The gallery is taking a breather</p>
      <p className="mt-2 max-w-sm text-sm text-mute">We couldn&apos;t load the photos right now. Please refresh in a moment.</p>
    </div>
  );
}

/** New York calendar date of an event start. */
const nyDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));

/**
 * One album per night. Title + place come from the event linked to the photos
 * (event_slug), else the site's event on that date, else the night's category.
 */
function toAlbums(facets: GalleryFacets, events: BombitaEvent[]): GalleryAlbum[] {
  const bySlug = new Map(events.map((e) => [e.slug, e]));
  const byDate = new Map(events.map((e) => [nyDate(e.startsAt), e]));
  return facets.dates.map((d) => {
    const ev = (d.event && bySlug.get(d.event)) || byDate.get(d.date);
    return {
      ...d,
      title: ev?.title ?? d.category ?? "Bombita Party",
      place: ev ? `${ev.venue.name}, New York` : "New York",
    };
  });
}

function AlbumsSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-6 h-12 w-64 animate-pulse bg-white/[0.06]" />
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 md:gap-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse bg-white/[0.05]" />)}
      </div>
    </div>
  );
}

/** Streams in behind the hero: one card per night. */
async function AlbumsSection() {
  if (!isDatabaseConfigured()) return <Unavailable />;
  let data: [GalleryFacets, BombitaEvent[]] | null = null;
  try {
    data = await Promise.all([galleryFacets(), getAllEvents()]);
  } catch (err) {
    log.error("photos.albums_failed", { error: err instanceof Error ? err.message : String(err) });
  }
  if (!data) return <Unavailable />;
  return <NightAlbums albums={toAlbums(data[0], data[1])} categories={data[0].categories} />;
}

async function gatePreviews() {
  if (isDatabaseConfigured()) {
    try {
      const [page, facets] = await Promise.all([listPublished({}, { limit: 6 }), galleryFacets()]);
      if (page.items.length) return { previews: page.items.map((i) => i.thumb.url), albumCount: facets.dates.length, photoCount: facets.total };
    } catch {
      /* fall through to the brand stills */
    }
  }
  return { previews: Object.values(bombita.stills).slice(0, 6), albumCount: 0, photoCount: 0 };
}

export default async function PhotosPage() {
  const member = await isMember();
  const instagram = socials.find((s) => s.network === "instagram");

  return (
    <>
      {/* ── Hero (ref: EVENT GALLERY) ── */}
      <section className="relative isolate overflow-hidden pt-[var(--nav-h)]">
        <div className="absolute inset-y-0 right-0 -z-10 w-full lg:w-[62%]">
          <ImageReveal className="absolute inset-0" direction="left">
            <Image src={img.sparklersBottles} alt="" fill priority sizes="(min-width: 1024px) 62vw, 100vw" quality={75} className="img-cine object-cover" />
          </ImageReveal>
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/40" />
          <p aria-hidden className="absolute bottom-16 right-6 hidden -rotate-12 text-right font-hand text-5xl leading-[0.95] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,.9)] md:block">
            This
            <br />
            is home
            <BrushUnderline className="ml-auto mt-1 block h-3 w-28" />
          </p>
        </div>
        <div className="container-lux flex min-h-[56svh] flex-col justify-center py-16 md:min-h-[70svh]">
          <p className="pl-[0.6em] text-xs font-semibold uppercase tracking-[0.6em] text-red-500 md:text-sm">Bombita Party</p>
          <SplitReveal as="h1" start="top 100%" className="mt-4 font-display text-[clamp(4.5rem,13vw,11rem)] uppercase leading-[0.84] tracking-wide">
            Event
            <br />
            Gallery
          </SplitReveal>
          <p className="mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-white/90 md:text-sm">Real people. Real vibes. Real Bombita.</p>
          <p className="mt-3 max-w-md text-sm text-white/70 md:text-base">Every Bombita night, documented. Pick a night, then open the album.</p>
        </div>
      </section>

      {!member ? (
        // Email gate: real photos are only sent to visitors who have joined.
        <GalleryGate {...await gatePreviews()} />
      ) : (
        <>
          <section aria-label="Event albums" className="container-lux pb-20 pt-8 md:pb-28">
            <Suspense fallback={<AlbumsSkeleton />}>
              <AlbumsSection />
            </Suspense>
          </section>

          {instagram && (
            <section className="border-t border-white/10 bg-ink-900 py-16 md:py-20">
              <div className="container-lux flex flex-col items-center gap-6 text-center">
                <p className="font-serif text-2xl italic text-white/85 md:text-3xl">Were you there? Tag us to be featured.</p>
                <Button href={instagram.url} variant="outline" size="lg">
                  {instagram.handle} on Instagram
                </Button>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
