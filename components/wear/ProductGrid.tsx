"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/shop/types";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/animations/Reveal";
import { ProductCard } from "./ProductCard";
import { QuickView } from "./QuickView";

/** Filterable product grid with quick view. */
export function ProductGrid({
  products,
  filters = true,
  className,
  cols = "lg:grid-cols-4",
  initialCategory = "All",
  mobileCarousel,
}: {
  products: Product[];
  filters?: boolean;
  className?: string;
  cols?: string;
  initialCategory?: string;
  /** Phones: a swipeable row instead of a 2-column grid. */
  mobileCarousel?: boolean;
}) {
  const [active, setActive] = useState<string>(initialCategory);
  const [quick, setQuick] = useState<Product | null>(null);
  const close = useCallback(() => setQuick(null), []);

  const categories = useMemo(
    () => ["All", ...(products.some((p) => p.badge === "New") ? ["New"] : []), ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );
  const list =
    active === "All" ? products : active === "New" ? products.filter((p) => p.badge === "New") : products.filter((p) => p.category === active);

  return (
    <div className={className}>
      {filters && (
        <div role="tablist" aria-label="Filter products" className="mb-10 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={active === c}
              onClick={() => setActive(c)}
              className={cn(
                "h-10 border px-5 text-[0.625rem] font-bold uppercase tracking-[0.24em] transition-colors duration-300",
                active === c ? "border-gold-400 bg-gold-400 text-ink-950" : "border-white/15 text-white/80 hover:border-white/50 hover:text-white",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <Reveal
        key={active}
        stagger={0.06}
        className={cn(
          "grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5",
          cols,
          mobileCarousel &&
            "max-md:-mx-[var(--gutter)] max-md:flex max-md:snap-x max-md:snap-mandatory max-md:gap-3 max-md:overflow-x-auto max-md:px-[var(--gutter)] max-md:pb-2 max-md:no-scrollbar",
        )}
      >
        {list.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onQuickView={setQuick}
            className={mobileCarousel ? "max-md:w-[68vw] max-md:shrink-0 max-md:snap-start max-md:scroll-ml-[var(--gutter)]" : undefined}
            sizes={mobileCarousel ? "(min-width: 1024px) 25vw, (min-width: 768px) 45vw, 70vw" : undefined}
          />
        ))}
      </Reveal>
      <QuickView product={quick} onClose={close} />
    </div>
  );
}

/** /wear?category=… — preselects the filter from the URL (wrap in <Suspense>). */
export function ProductGridFromQuery({ products }: { products: Product[] }) {
  const category = useSearchParams().get("category") ?? "All";
  return <ProductGrid key={category} products={products} initialCategory={category} />;
}
