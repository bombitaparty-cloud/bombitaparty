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
import { DateGallery } from "@/components/gallery/DateGallery";
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton";
import { isMember } from "@/lib/member";
import { isDatabaseConfigured } from "@/lib/db";
import { galleryFacets, listPublished } from "@/lib/media/queries";
import { parseFilters } from "@/lib/media/http";
import { log } from "@/lib/log";
import type { GalleryFilters } from "@/lib/media/types";

export const metadata: Metadata = {
  title: "Event Gallery",
  description: "Real people. Real vibes. Real Bombita. Photo and video recaps from Bombita nights across New York City, by date.",
  alternates: { canonical: "/photos" },
};

/** Ignore malformed filter params instead of failing the page. */
function safeFilters(sp: Record<string, string | string[] | undefined>): GalleryFilters {
  const usp = new URLSearchParams();
  for (const k of ["date", "from", "to", "type", "category", "tag"]) {
    const v = sp[k];
    if (typeof v === "string" && v) usp.set(k, v);
  }
  try {
    return parseFilters(usp);
  } catch {
    return {};
  }
}

function Unavailable() {
  return (
    <div role="alert" className="flex flex-col items-center border border-white/10 px-6 py-16 text-center">
      <AlertTriangle className="h-7 w-7 text-gold-300" aria-hidden />
      <p className="mt-4 font-display text-4xl tracking-wide">The gallery is taking a breather</p>
      <p className="mt-2 max-w-sm text-sm text-mute">We couldn&apos;t load the photos right now. Please refresh in a moment.</p>
    </div>
  );
}

/** Streams in behind the hero: first page of thumbnails + date headings. */
async function GallerySection({ filters }: { filters: GalleryFilters }) {
  if (!isDatabaseConfigured()) return <Unavailable />;
  let data: [Awaited<ReturnType<typeof listPublished>>, Awaited<ReturnType<typeof galleryFacets>>] | null = null;
  try {
    data = await Promise.all([
      listPublished(filters, { limit: 30 }),
      galleryFacets({ type: filters.type, category: filters.category, tag: filters.tag }),
    ]);
  } catch (err) {
    log.error("photos.gallery_failed", { error: err instanceof Error ? err.message : String(err) });
  }
  if (!data) return <Unavailable />;
  return <DateGallery initial={data[0]} facets={data[1]} filters={filters} />;
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

export default async function PhotosPage({ searchParams }: PageProps<"/photos">) {
  const [sp, member] = await Promise.all([searchParams, isMember()]);
  const filters = safeFilters(sp);
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
        </div>
      </section>

      {!member ? (
        // Email gate: real photos are only sent to visitors who have joined.
        <GalleryGate {...await gatePreviews()} />
      ) : (
        <>
          <section aria-label="Event gallery by date" className="container-lux pb-20 pt-8 md:pb-28">
            <Suspense key={JSON.stringify(filters)} fallback={<GallerySkeleton rows={3} />}>
              <GallerySection filters={filters} />
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
