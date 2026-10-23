import Image from "next/image";
import { bombita, img, reel } from "@/data/media";
import { LazyLoop } from "@/components/video/VideoWall";
import { TLink } from "@/components/ui/TLink";
import { ImageReveal } from "@/components/animations/Reveal";

const tiles = [
  { title: "Events", sub: "Upcoming parties", href: "/events", image: reel(12).poster, video: reel(12).src, alt: "Live band on the Bombita Party stage" },
  { title: "Store", sub: "Bombita Wear", href: "/wear", image: img.capBack, alt: "Cap and hoodie streetwear" },
  { title: "Photos", sub: "Real people. Real vibes.", href: "/photos", image: bombita.stills.stageBanner, alt: "Live band under the Bombita Party banner" },
  { title: "Videos", sub: "Relive the moments", href: "/videos", image: reel(9).poster, video: reel(9).src, alt: "Accordion player performing at Bombita Party" },
];

export interface TilePhoto {
  src: string;
  srcSet?: string;
  alt: string;
}

const STEP = 4; // seconds each photo stays up in the Photos tile

/** Photos tile: a slow crossfade of real gallery photos (CSS only; still for reduced motion). */
function PhotoCrossfade({ photos }: { photos: TilePhoto[] }) {
  // Always 4 slots (the keyframes are written for quarters); repeat photos when fewer.
  const slots = Array.from({ length: 4 }, (_, i) => photos[i % photos.length]);
  const n = slots.length;
  return (
    <span className="absolute inset-0 transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover:scale-110">
      {slots.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- pre-optimized WebP renditions from the media API
        <img
          key={`${i}-${p.src}`}
          src={p.src}
          srcSet={p.srcSet}
          sizes="(min-width: 1024px) 25vw, 50vw"
          alt={i === 0 ? p.alt : ""}
          loading="lazy"
          decoding="async"
          className="tile-fade img-cine absolute inset-0 h-full w-full object-cover"
          style={{
            animationDuration: `${n * STEP}s`,
            // Negative delays: photo i is mid-cycle so exactly one is visible at any moment.
            animationDelay: i === 0 ? "0s" : `-${(n - i) * STEP}s`,
          }}
        />
      ))}
    </span>
  );
}

/** Four image doors under the upcoming events. The Photos door previews the real gallery. */
export function CategoryTiles({ photos = [] }: { photos?: TilePhoto[] }) {
  return (
    <section aria-label="Explore Bombita" className="border-y border-white/10 bg-ink-950 p-2 md:p-3">
      <ul className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <li key={t.href}>
            <TLink
              href={t.href}
              data-cursor="Explore"
              className="group relative block aspect-[4/5] overflow-hidden md:aspect-[5/6]"
            >
              <ImageReveal className="absolute inset-0" delay={i * 0.08}>
                {t.href === "/photos" && photos.length > 1 ? (
                  <PhotoCrossfade photos={photos} />
                ) : t.href === "/photos" && photos.length === 1 ? (
                  // eslint-disable-next-line @next/next/no-img-element -- pre-optimized WebP rendition
                  <img src={photos[0].src} srcSet={photos[0].srcSet} sizes="(min-width: 1024px) 25vw, 50vw" alt={photos[0].alt} loading="lazy" decoding="async" className="img-cine absolute inset-0 h-full w-full object-cover transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover:scale-110" />
                ) : "video" in t && t.video ? (
                  <span className="absolute inset-0 transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover:scale-110">
                    <LazyLoop src={t.video} poster={t.image} />
                  </span>
                ) : (
                <Image
                  src={t.image}
                  alt={t.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  quality={75}
                  className="img-cine object-cover transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover:scale-110"
                />
                )}
              </ImageReveal>
              <span className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/35 to-transparent transition-opacity duration-700 group-hover:opacity-80" />
              <span className="pointer-events-none absolute inset-0 border border-gold-400/0 transition-colors duration-700 group-hover:border-gold-400/70" />
              <span className="absolute inset-x-0 bottom-0 flex flex-col items-center p-5 text-center md:p-8">
                <span className="pl-[0.3em] text-xl font-semibold uppercase tracking-[0.3em] text-white transition-transform duration-700 ease-[var(--ease-expo)] group-hover:-translate-y-1 md:text-3xl">
                  {t.title}
                </span>
                <span className="mt-1.5 pl-[0.35em] text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-white/75 md:text-[0.65rem]">
                  {t.sub}
                </span>
                <span className="mt-4 h-0.5 w-8 bg-red-500 transition-all duration-700 ease-[var(--ease-expo)] group-hover:w-16" />
              </span>
            </TLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
