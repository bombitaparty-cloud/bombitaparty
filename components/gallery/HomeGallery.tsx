import Image from "next/image";
import { bombita, img } from "@/data/media";
import { Button } from "@/components/ui/Button";
import { TLink } from "@/components/ui/TLink";
import { ImageReveal, SplitReveal } from "@/components/animations/Reveal";

/** Ref layout: four tall frames (neon · friends · flag · patio) with the headline across the bottom. */
const frames = [
  { src: bombita.stills.stageBanner, alt: "Live band under the Bombita Party banner" },
  { src: bombita.stills.crowdLights, alt: "The crowd under the lights" },
  { src: img.paradeFlag, alt: "Celebrating with the Dominican flag" },
  { src: bombita.stills.singerBraids, alt: "Headliner performing at Bombita Party" },
];

export function HomeGallery() {
  return (
    <section aria-labelledby="gallery-title" className="relative overflow-hidden bg-ink-950 pb-16 pt-2 md:pb-24">
      <div className="relative">
        <ul className="grid grid-cols-2 gap-2 px-2 md:grid-cols-4 md:gap-3 md:px-3">
          {frames.map((f, i) => (
            <li key={f.src}>
              <TLink href="/photos" data-cursor="View" aria-label={`Open gallery — ${f.alt}`} className="group relative block aspect-[3/4] overflow-hidden">
                <ImageReveal className="absolute inset-0" direction={i % 2 ? "left" : "up"} delay={i * 0.07}>
                  <Image
                    src={f.src}
                    alt={f.alt}
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    quality={75}
                    className="img-cine object-cover transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover:scale-110"
                  />
                </ImageReveal>
                <span className="pointer-events-none absolute inset-0 border border-gold-400/0 transition-colors duration-700 group-hover:border-gold-400/70" />
              </TLink>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-6 text-center md:pb-10">
          <SplitReveal as="h2" className="pl-[0.4em] text-lg font-semibold uppercase tracking-[0.4em] text-white md:text-3xl">
            <span id="gallery-title">
              Real people. <span className="text-gold-300">Real vibes.</span>
            </span>
          </SplitReveal>
          <div className="mt-6">
            <Button href="/photos" variant="outline" size="md">
              View Gallery
            </Button>
          </div>
        </div>
      </div>

    </section>
  );
}
