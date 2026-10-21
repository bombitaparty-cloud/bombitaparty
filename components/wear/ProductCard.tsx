"use client";

import Image from "next/image";
import { Eye } from "lucide-react";
import type { Product } from "@/lib/shop/types";
import { cn, formatPrice } from "@/lib/utils";
import { TLink } from "@/components/ui/TLink";

export function ProductCard({
  product,
  onQuickView,
  className,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 50vw",
}: {
  product: Product;
  onQuickView?: (p: Product) => void;
  className?: string;
  sizes?: string;
}) {
  const [first, second] = product.images;
  const href = `/wear/${product.handle}`;
  return (
    <article className={cn("group relative", className)}>
      <div className="relative aspect-[3/4] overflow-hidden bg-ink-700">
        <TLink href={href} data-cursor="Shop" aria-label={product.name} className="absolute inset-0 block">
          <Image
            src={first.src}
            alt={first.alt}
            fill
            sizes={sizes}
            quality={75}
            className="object-cover transition-[transform,opacity] duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-[1.06]"
          />
          {second && (
            <Image
              src={second.src}
              alt=""
              fill
              sizes={sizes}
              quality={75}
              className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-transparent" />
        </TLink>
        {product.badge && (
          <span className="pointer-events-none absolute left-3 top-3 bg-ink-950/80 px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.25em] text-gold-300 backdrop-blur-sm">
            {product.badge}
          </span>
        )}
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(product)}
            aria-label={`Quick view ${product.name}`}
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-ink-950/75 text-white backdrop-blur-md md:hidden"
          >
            <Eye className="h-4 w-4" aria-hidden />
          </button>
        )}
        <div className="absolute inset-x-3 bottom-3 hidden gap-2 transition-all duration-500 ease-[var(--ease-expo)] md:flex md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100">
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="flex h-11 flex-1 items-center justify-center gap-2 bg-ink-950/85 text-[0.6rem] font-bold uppercase tracking-[0.22em] text-white backdrop-blur-md transition-colors hover:bg-white hover:text-ink-950"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden /> Quick view
            </button>
          )}
          <TLink
            href={href}
            className="flex h-11 flex-1 items-center justify-center bg-gold-400 text-[0.6rem] font-bold uppercase tracking-[0.22em] text-ink-950 transition-colors hover:bg-gold-300"
          >
            Shop
          </TLink>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h3 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white transition-colors group-hover:text-gold-300">
            {product.name}
          </h3>
          <p className="mt-1 text-[0.7rem] uppercase tracking-[0.16em] text-mute-2">
            {product.category} · {product.colors.length} {product.colors.length === 1 ? "color" : "colors"}
          </p>
        </div>
        <p className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-gold-300 sm:text-[0.75rem]">
          {formatPrice(product.price, product.currency)}
        </p>
      </div>
    </article>
  );
}
