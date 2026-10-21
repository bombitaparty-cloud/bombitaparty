"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import type { Album } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { Lightbox } from "./Lightbox";

const PAGE = 9;

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(iso + "T12:00:00Z"))
    .toUpperCase();

/** Event recap albums: search, category chips, load more, album lightbox. */
export function AlbumGallery({
  albums,
  categories,
  initialCategory,
}: {
  albums: Album[];
  categories: readonly string[];
  initialCategory?: string | null;
}) {
  const [category, setCategory] = useState(initialCategory && categories.includes(initialCategory) ? initialCategory : "All");
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(PAGE);
  const [openAlbum, setOpenAlbum] = useState<Album | null>(null);
  const [index, setIndex] = useState<number | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...albums]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((a) => category === "All" || a.category === category)
      .filter((a) => !q || `${a.title} ${a.venue} ${a.category}`.toLowerCase().includes(q));
  }, [albums, category, query]);

  const visible = list.slice(0, count);

  return (
    <>
      <div className="mb-8 flex flex-col gap-3 lg:flex-row">
        <label className="flex h-12 items-center gap-3 border border-white/20 px-4 transition-colors focus-within:border-gold-300 lg:w-80">
          <Search className="h-4 w-4 text-white/60" aria-hidden />
          <span className="sr-only">Search events</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCount(PAGE);
            }}
            placeholder="Search events…"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
          />
        </label>
        <div role="tablist" aria-label="Gallery categories" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap">
          {["All", ...categories].map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => {
                setCategory(c);
                setCount(PAGE);
              }}
              className={cn(
                "h-12 shrink-0 border px-6 font-display text-base uppercase tracking-[0.12em] transition-colors",
                category === c ? "border-red-500 bg-red-500 text-white" : "border-white/20 text-white/85 hover:border-white/60",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-20 text-center text-mute">No galleries match “{query}”.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((a, i) => (
              <motion.li
                key={a.slug}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: (i % PAGE) * 0.04 }}
              >
                <button
                  type="button"
                  data-cursor="View"
                  onClick={() => {
                    setOpenAlbum(a);
                    setIndex(0);
                  }}
                  aria-label={`Open ${a.title} gallery, ${a.photos.length} photos`}
                  className="group relative block aspect-[3/2] w-full overflow-hidden border border-white/10 text-left transition-colors duration-500 hover:border-gold-400/60"
                >
                  <Image
                    src={a.cover}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    quality={75}
                    className="img-cine object-cover transition-transform duration-[1.4s] ease-[var(--ease-expo)] group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/30 to-transparent" />
                  <span className="absolute right-4 top-4 bg-ink-950/70 px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.2em] text-white/85 backdrop-blur">
                    {a.photos.length} photos
                  </span>
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                    <span>
                      <span className="block text-xs font-semibold tracking-[0.15em] text-white/85">{fmt(a.date)}</span>
                      <span className="mt-1 block font-display text-3xl uppercase leading-[0.95] tracking-wide text-white">{a.title}</span>
                      <span className="mt-1 block text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-white/75">
                        {a.venue} <span className="text-red-500">•</span> NYC
                      </span>
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 transition-all duration-500 group-hover:border-gold-300 group-hover:bg-gold-400 group-hover:text-ink-950">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {count < list.length && (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => setCount((c) => c + 6)}
            className="flex h-14 items-center gap-4 border border-white/30 px-12 font-display text-lg uppercase tracking-[0.18em] text-white transition-colors hover:border-gold-300 hover:text-gold-300"
          >
            Load more <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      <Lightbox
        images={(openAlbum?.photos ?? []).map((src, i) => ({ src, alt: `${openAlbum?.title} — photo ${i + 1}` }))}
        index={index}
        onChange={setIndex}
        onClose={() => {
          setIndex(null);
          setOpenAlbum(null);
        }}
      />
    </>
  );
}

/** /photos?category=… — preselects the chip from the URL (wrap in <Suspense>). */
export function AlbumGalleryFromQuery(props: { albums: Album[]; categories: readonly string[] }) {
  const category = useSearchParams().get("category");
  return <AlbumGallery key={category ?? "all"} {...props} initialCategory={category} />;
}
