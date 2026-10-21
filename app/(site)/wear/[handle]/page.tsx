import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, RotateCcw, Sparkles } from "lucide-react";
import { getProduct, getProducts } from "@/lib/shop";
import { formatPrice } from "@/lib/utils";
import { TLink } from "@/components/ui/TLink";
import { Button } from "@/components/ui/Button";
import { SizePicker } from "@/components/wear/SizePicker";
import { ProductGrid } from "@/components/wear/ProductGrid";
import { ImageReveal } from "@/components/animations/Reveal";

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: PageProps<"/wear/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const p = await getProduct(handle);
  if (!p) return {};
  return {
    title: `${p.name} — Bombita Wear`,
    description: p.description,
    alternates: { canonical: `/wear/${p.handle}` },
    openGraph: { images: [{ url: p.images[0].src, alt: p.images[0].alt }] },
  };
}

export default async function ProductPage({ params }: PageProps<"/wear/[handle]">) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();
  const related = (await getProducts()).filter((p) => p.id !== product.id).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.src),
    brand: { "@type": "Brand", name: "Bombita Wear" },
    ...(product.price != null && {
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: product.currency,
        availability: product.available === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        url: product.url,
      },
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="container-lux pb-20 pt-[calc(var(--nav-h)+2.5rem)] md:pb-28">
        <TLink href="/wear" className="eyebrow inline-flex items-center gap-2 text-mute transition-colors hover:text-gold-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Bombita Wear
        </TLink>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
            {product.images.map((img, i) => (
              <ImageReveal
                key={img.src}
                className={i === 0 ? "aspect-[3/4] bg-ink-700 sm:col-span-2" : "aspect-[3/4] bg-ink-700"}
                direction={i % 2 ? "right" : "up"}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  priority={i === 0}
                  sizes={i === 0 ? "(min-width: 1024px) 55vw, 100vw" : "(min-width: 1024px) 28vw, 50vw"}
                  quality={75}
                  className="object-cover"
                />
              </ImageReveal>
            ))}
          </div>

          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)]">
              <p className="eyebrow text-gold-400">
                Bombita Wear · {product.category}
                {product.badge && <span className="ml-3 text-white/70">— {product.badge}</span>}
              </p>
              <h1 className="mt-4 font-display text-6xl leading-[0.88] tracking-wide md:text-7xl">{product.name}</h1>
              <p className="mt-4 text-base font-semibold uppercase tracking-[0.18em] text-gold-300">
                {formatPrice(product.price, product.currency)}
              </p>
              <p className="mt-8 text-base leading-relaxed text-white/80">{product.description}</p>

              {product.colors.length > 0 && (
                <div className="mt-8">
                  <p className="eyebrow text-[0.6rem] text-mute-2">Colors</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {product.colors.map((c) => (
                      <li key={c} className="border border-white/15 px-3 py-2 text-xs uppercase tracking-[0.15em] text-white/85">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <SizePicker sizes={product.sizes} className="mt-6" />

              <div className="mt-10">
                {product.url ? (
                  <Button href={product.url} size="lg" className="w-full" magnetic={false}>
                    Buy now
                  </Button>
                ) : (
                  <Button href="/#join" size="lg" className="w-full" magnetic={false}>
                    Notify me at launch
                  </Button>
                )}
              </div>
              {product.isPlaceholder && (
                <p className="mt-4 text-xs leading-relaxed text-mute-2">
                  Sample product — checkout opens with the official Bombita Wear launch. Join the list for first access.
                </p>
              )}

              <ul className="mt-10 border-t border-white/10">
                {product.details.map((d) => (
                  <li key={d} className="flex items-center gap-3 border-b border-white/10 py-3.5 text-sm text-white/80">
                    <Sparkles className="h-3.5 w-3.5 text-gold-400" aria-hidden /> {d}
                  </li>
                ))}
                <li className="flex items-center gap-3 border-b border-white/10 py-3.5 text-sm text-white/80">
                  <Truck className="h-3.5 w-3.5 text-gold-400" aria-hidden /> Shipping details at checkout
                </li>
                <li className="flex items-center gap-3 border-b border-white/10 py-3.5 text-sm text-white/80">
                  <RotateCcw className="h-3.5 w-3.5 text-gold-400" aria-hidden /> Returns policy at launch
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="related" className="border-t border-white/10 bg-ink-900 py-20 md:py-28">
        <div className="container-lux">
          <h2 id="related" className="mb-12 font-display text-5xl tracking-wide md:text-6xl">
            Complete the look
          </h2>
          <ProductGrid products={related} filters={false} />
        </div>
      </section>
    </>
  );
}
