import type { Product } from "@/lib/shop/types";
import { site } from "@/data/site";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/animations/Reveal";
import { Marquee } from "@/components/ui/Marquee";
import { ProductGrid } from "./ProductGrid";

export function WearFeature({ products }: { products: Product[] }) {
  return (
    <section aria-labelledby="wear-title" className="relative overflow-hidden bg-ink-900 py-24 md:py-36">
      <Marquee
        items={["Bombita Wear", "Clothing", "Lifestyle", "Represent", "Quisqueya to Uptown"]}
        className="pointer-events-none absolute inset-x-0 top-10 font-display text-[18vw] leading-none text-white/[0.03] md:text-[12vw]"
        duration={60}
        starClassName="text-gold-400/10"
      />

      <div className="container-lux relative">
        <div>
          <SectionLabel index="05">Bombita Wear</SectionLabel>
          <h2 id="wear-title" className="mt-5 font-display text-[clamp(3rem,8vw,7rem)] uppercase leading-[0.88] tracking-wide">
            Bombita <span className="text-gold-300">Wear</span>
          </h2>
          <Reveal>
            <p className="mt-6 flex flex-wrap gap-y-2 text-[0.62rem] font-bold uppercase tracking-[0.3em] text-white md:text-[0.7rem] md:tracking-[0.45em]">
              {site.phrases.wearLine.split("×").map((w, i, a) => (
                <span key={w}>
                  {w.trim()}
                  {i < a.length - 1 && <span className="mx-3 text-gold-400">×</span>}
                </span>
              ))}
            </p>
            <p className="mt-6 max-w-lg font-serif text-2xl italic leading-snug text-white/85 md:text-3xl">
              Wear the night. Pieces made for the people who close the party and open the next one.
            </p>
          </Reveal>
          <ProductGrid products={products.slice(0, 4)} filters={false} cols="lg:grid-cols-4" className="mt-10 md:mt-12" mobileCarousel />
          <div className="mt-12 flex flex-wrap items-center gap-6">
            <Button href="/wear" size="lg">
              Shop Now
            </Button>
            <span className="eyebrow text-mute-2">{site.phrases.heritage}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
