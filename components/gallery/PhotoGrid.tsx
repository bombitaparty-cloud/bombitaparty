"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { ImageReveal } from "@/components/animations/Reveal";
import { Lightbox } from "./Lightbox";

const aspect: Record<NonNullable<Photo["shape"]>, string> = {
  portrait: "aspect-[4/5]",
  landscape: "aspect-[3/2]",
  square: "aspect-square",
  tall: "aspect-[2/3]",
};

/** Masonry gallery (CSS columns) with album filter + lightbox. */
export function PhotoGrid({ photos, filters = true }: { photos: Photo[]; filters?: boolean }) {
  const [album, setAlbum] = useState("All");
  const [open, setOpen] = useState<number | null>(null);
  const albums = useMemo(
    () => ["All", ...Array.from(new Set(photos.map((p) => p.album).filter(Boolean) as string[]))],
    [photos],
  );
  const list = album === "All" ? photos : photos.filter((p) => p.album === album);

  return (
    <>
      {filters && albums.length > 2 && (
        <div role="tablist" aria-label="Albums" className="mb-10 flex flex-wrap gap-2">
          {albums.map((a) => (
            <button
              key={a}
              role="tab"
              aria-selected={album === a}
              onClick={() => setAlbum(a)}
              className={cn(
                "h-10 border px-5 text-[0.625rem] font-bold uppercase tracking-[0.24em] transition-colors duration-300",
                album === a ? "border-gold-400 bg-gold-400 text-ink-950" : "border-white/15 text-white/80 hover:border-white/50",
              )}
            >
              {a}
            </button>
          ))}
        </div>
      )}
      <div key={album} className="columns-2 gap-3 md:columns-3 md:gap-5 xl:columns-4">
        {list.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            data-cursor="View"
            aria-label={`Open photo: ${p.alt}`}
            className="group relative mb-3 block w-full break-inside-avoid overflow-hidden md:mb-5"
          >
            <ImageReveal className={cn("w-full", aspect[p.shape ?? "portrait"])}>
              <Image
                src={p.src}
                alt={p.alt}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                quality={60}
                className="img-cine object-cover transition-transform duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-105"
              />
            </ImageReveal>
            <span className="pointer-events-none absolute inset-0 border border-gold-400/0 transition-colors duration-500 group-hover:border-gold-400/60" />
            {p.album && (
              <span className="eyebrow absolute bottom-3 left-3 text-[0.55rem] text-white opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                {p.album}
              </span>
            )}
          </button>
        ))}
      </div>
      <Lightbox images={list} index={open} onChange={setOpen} onClose={() => setOpen(null)} />
    </>
  );
}
