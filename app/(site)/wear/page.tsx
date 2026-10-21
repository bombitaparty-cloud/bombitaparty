import type { Metadata } from "next";
import Image from "next/image";
import { getProducts } from "@/lib/shop";
import { wearEditorial } from "@/data/products";
import { site } from "@/data/site";
import { Suspense } from "react";
import { ProductGrid, ProductGridFromQuery } from "@/components/wear/ProductGrid";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Marquee } from "@/components/ui/Marquee";
import { ImageReveal, Parallax, Reveal, SplitReveal } from "@/components/animations/Reveal";

export const metadata: Metadata = {
  title: "Bombita Wear",
  description: "Bombita Wear — clothing, lifestyle, represent. Caps, hoodies, tees and jackets from New York City.",
  alternates: { canonical: "/wear" },
};

export default async function WearPage() {
  const products = await getProducts();
  const demo = products.some((p) => p.isPlaceholder);

  return (
    <>
      {/* Editorial hero */}
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden pb-16 pt-[var(--nav-h)] md:pb-24">
        <Parallax className="absolute inset-0 -z-10" speed={8}>
          <Image src={wearEditorial.hero} alt="Bombita Wear campaign" fill priority sizes="100vw" quality={75} className="img-cine object-cover" />
        </Parallax>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/30" />
        <div className="container-lux text-center">
          <p className="eyebrow text-white/85">
            {site.phrases.wearLine.split("×").map((w, i, a) => (
              <span key={w}>
                {w.trim()}
                {i < a.length - 1 && <span className="mx-3 text-gold-400">×</span>}
              </span>
            ))}
          </p>
          <h1 className="mt-4">
            <span className="block -rotate-3 font-brush text-[clamp(5rem,20vw,16rem)] leading-[0.82] text-chrome-gradient drop-shadow-[0_10px_40px_rgba(0,0,0,.6)]">
              BOMBITA
            </span>
            <span className="mt-2 block font-display text-[clamp(2.5rem,7vw,5.5rem)] tracking-[0.6em] text-gold-vertical">WEAR</span>
          </h1>
          <p className="mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.55em] text-white/80">{site.phrases.heritage}</p>
        </div>
      </section>

      <Marquee
        items={["New drop", "Clothing", "Lifestyle", "Represent", "Uptown NYC", "Bombita Wear"]}
        className="border-y border-gold-500/15 bg-ink-900 py-4 text-[0.7rem] font-bold uppercase tracking-[0.4em] text-white/70"
      />

      {/* Shop */}
      <section id="shop" aria-labelledby="shop-title" className="container-lux py-20 md:py-28">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionLabel>The collection</SectionLabel>
            <SplitReveal as="h2" className="mt-5 font-display text-6xl leading-[0.88] tracking-wide md:text-8xl">
              <span id="shop-title">Shop the drop</span>
            </SplitReveal>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-mute">
            Made in small runs for the familia. When a piece is gone, it&apos;s gone.
          </p>
        </div>
        {demo && (
          <p className="mb-10 border-l border-gold-500/50 pl-4 text-xs leading-relaxed text-mute-2">
            Store preview — products shown are samples. Final photography, pricing and checkout go live with the official launch.
          </p>
        )}
        <Suspense fallback={<ProductGrid products={products} />}>
          <ProductGridFromQuery products={products} />
        </Suspense>
      </section>

      {/* Lookbook */}
      <section aria-labelledby="lookbook-title" className="bg-ink-900 py-20 md:py-28">
        <div className="container-lux">
          <SectionLabel>Lookbook</SectionLabel>
          <h2 id="lookbook-title" className="mt-5 font-serif text-5xl italic text-white md:text-7xl">
            Dressed for the <span className="text-gold-300">after.</span>
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-12 md:gap-5">
            {wearEditorial.lookbook.map((src, i) => (
              <ImageReveal
                key={src}
                direction={i === 1 ? "up" : i === 0 ? "left" : "right"}
                className={i === 1 ? "aspect-[3/4] md:col-span-4 md:mt-24" : "aspect-[3/4] md:col-span-4"}
              >
                <Image src={src} alt="Bombita Wear lookbook" fill sizes="(min-width: 768px) 33vw, 100vw" quality={75} className="img-cine object-cover" />
              </ImageReveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-16 max-w-2xl text-lg leading-relaxed text-white/80">
              Bombita Wear carries the night into the day — pieces with the energy of the party and the pride of where
              we come from. {site.phrases.heritage}.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
