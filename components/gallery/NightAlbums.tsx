"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Camera, Loader2, Play, X } from "lucide-react";
import type { GalleryAlbum, GalleryItem, GalleryPage } from "@/lib/media/types";
import { useLenis } from "@/components/animations/Providers";
import { cn } from "@/lib/utils";
import { MediaLightbox } from "./MediaLightbox";
import { LOGO } from "@/components/ui/Logo";

const ALBUM_STEP = 12;
const PHOTO_STEP = 24;

const monthYear = (d: string, long = false) =>
  new Intl.DateTimeFormat("en-US", { month: long ? "long" : "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const dayLabel = (d: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

/* ── Album card ─────────────────────────────────────────────────────────── */

const AlbumCard = memo(function AlbumCard({ album, eager, onOpen }: { album: GalleryAlbum; eager: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-cursor="Open"
      aria-label={`${album.title}, ${album.place}, ${monthYear(album.date, true)}, ${album.count ? `${album.count} ${album.count === 1 ? "item" : "photos"}` : "photos coming soon"}`}
      className="group relative block aspect-[4/5] w-full overflow-hidden bg-ink-900 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
    >
      {!album.cover && (
        // Album created in the admin, photos not published yet: branded placeholder.
        <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(70%_60%_at_50%_35%,rgba(224,185,79,.22),transparent_70%),linear-gradient(180deg,#1a1410,#050505)]">
          <Image src={LOGO.logo.src} width={LOGO.logo.width} height={LOGO.logo.height} sizes="200px" alt="" className="h-auto w-3/5 opacity-85 transition-transform duration-700 group-hover:scale-105" />
        </span>
      )}
      {album.cover && (
        // eslint-disable-next-line @next/next/no-img-element -- pre-optimized 480 px WebP from the media API
        <img
          src={album.cover}
          alt=""
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-105"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/25 to-transparent" />
      <span className="absolute right-2 top-2 border border-white/20 bg-ink-950/70 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white/85">
        {album.count ? `${album.count} ${album.videos && !album.images ? "videos" : "photos"}` : "Photos coming soon"}
      </span>
      <span className="absolute inset-x-0 bottom-0 p-3 md:p-4">
        <span className="block font-display text-2xl uppercase leading-[0.95] tracking-wide text-white transition-colors group-hover:text-gold-300 md:text-3xl">
          {album.title}
        </span>
        <span className="mt-1 block text-[0.7rem] font-semibold text-white/80 md:text-xs">
          {album.place}, {monthYear(album.date)}
        </span>
        <span className="mt-2 block h-0.5 w-8 bg-red-500 transition-all duration-500 group-hover:w-14" aria-hidden />
      </span>
    </button>
  );
});

/* ── Album sheet (one night) ────────────────────────────────────────────── */

function AlbumSheet({ album, onClose }: { album: GalleryAlbum; onClose: () => void }) {
  const lenis = useLenis();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [open, setOpen] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  // First page whenever the album (or a retry) changes.
  useEffect(() => {
    let live = true;
    if (album.count === 0) {
      queueMicrotask(() => live && setState("idle"));
      return () => {
        live = false;
      };
    }
    fetch(`/api/gallery?date=${album.date}&limit=${PHOTO_STEP}`)
      .then((r) => (r.ok ? (r.json() as Promise<GalleryPage>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((page) => {
        if (!live) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setState("idle");
      })
      .catch(() => live && setState("error"));
    return () => {
      live = false;
    };
  }, [album.count, album.date, tick]);

  const more = useCallback(async () => {
    if (!cursor || state === "loading") return;
    setState("loading");
    try {
      const r = await fetch(`/api/gallery?date=${album.date}&limit=${PHOTO_STEP}&cursor=${cursor}`);
      if (!r.ok) throw new Error();
      const page = (await r.json()) as GalleryPage;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
      });
      setCursor(page.nextCursor);
      setState("idle");
    } catch {
      setState("error");
    }
  }, [album.date, cursor, state]);

  // Lock page scroll, Esc closes (unless the photo viewer is open).
  useEffect(() => {
    const l = lenis.current;
    l?.stop();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.documentElement.style.overflow = prev;
      l?.start();
    };
  }, [lenis]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && open === null && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  const remaining = Math.max(album.count - items.length, 0);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="album-title" className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-ink-950" data-lenis-prevent>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-ink-950/95 px-4 py-4 md:px-8 md:py-6">
        <div className="min-w-0">
          <h2 id="album-title" className="font-display text-3xl uppercase leading-[0.95] tracking-wide md:text-5xl">
            {album.title}
          </h2>
          <p className="mt-1 text-xs text-white/75 md:text-sm">
            {album.place}, {monthYear(album.date, true)} · {dayLabel(album.date)} · {album.count ? `${album.count} ${album.count === 1 ? "photo" : "photos"}` : "photos coming soon"}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="flex h-11 shrink-0 items-center gap-2 border border-white/25 px-4 text-xs font-bold uppercase tracking-[0.18em] text-white hover:border-gold-400 hover:text-gold-300"
        >
          Close <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="px-1 pb-16 pt-1 md:px-4 md:pt-4">
        {album.count === 0 && (
          <div className="mx-auto mt-16 flex max-w-md flex-col items-center px-6 text-center">
            <Camera className="h-8 w-8 text-gold-300" aria-hidden />
            <p className="mt-4 font-display text-4xl uppercase tracking-wide">Photos coming soon</p>
            <p className="mt-2 text-sm text-mute">The recap from this night is on its way. Check back shortly — or tag @bombitaparty with your shots.</p>
          </div>
        )}
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:gap-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`Open ${it.type === "video" ? "video" : "photo"} ${i + 1} of ${album.count}`}
                className="group relative block aspect-[4/5] w-full overflow-hidden bg-ink-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- pre-optimized WebP renditions */}
                <img
                  src={(it.type === "video" ? (it.poster ?? it.thumb) : it.thumb).url}
                  srcSet={it.type === "image" && it.display?.w ? `${it.thumb.url} ${it.thumb.w}w, ${it.display.url} ${it.display.w}w` : undefined}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  alt=""
                  loading={i < 8 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                {it.type === "video" && (
                  <span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-gold-400 text-ink-950">
                    <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden />
                  </span>
                )}
              </button>
            </li>
          ))}
          {state === "loading" &&
            Array.from({ length: items.length ? 4 : 8 }, (_, i) => <li key={`s${i}`} aria-hidden className="aspect-[4/5] animate-pulse bg-white/[0.05]" />)}
        </ul>

        {state === "error" && (
          <div role="alert" className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-3 text-center text-sm text-red-200">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            Couldn&apos;t load these photos.
            <button type="button" onClick={() => (items.length ? more() : (setState("loading"), setTick((t) => t + 1)))} className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">
              Try again
            </button>
          </div>
        )}
        {cursor && state === "idle" && (
          <div className="mt-6 flex justify-center">
            <button type="button" onClick={more} className="h-12 border border-white/25 px-6 text-xs font-bold uppercase tracking-[0.2em] text-white hover:border-gold-400 hover:text-gold-300">
              Show more photos ({remaining} more)
            </button>
          </div>
        )}
        {state === "loading" && items.length > 0 && (
          <p className="mt-6 flex justify-center text-mute">
            <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" />
          </p>
        )}
      </div>

      <MediaLightbox items={items} index={open} total={album.count} onNearEnd={more} onChange={setOpen} onClose={() => setOpen(null)} />
    </div>
  );
}

/* ── Albums page ────────────────────────────────────────────────────────── */

export function NightAlbums({ albums, categories }: { albums: GalleryAlbum[]; categories: { name: string; count: number }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [shown, setShown] = useState(ALBUM_STEP);

  const list = useMemo(() => (category ? albums.filter((a) => a.category === category) : albums), [albums, category]);
  const openDate = params.get("album");
  const openAlbum = openDate ? albums.find((a) => a.date === openDate) ?? null : null;

  // Album + filter live in the URL so a night can be shared.
  const setQuery = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v); else p.delete(k);
    const qs = p.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };
  const close = useCallback(() => {
    const p = new URLSearchParams(window.location.search);
    p.delete("album");
    const qs = p.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [pathname, router]);

  if (!albums.length) {
    return (
      <div className="flex flex-col items-center border border-dashed border-white/15 px-6 py-20 text-center">
        <Camera className="h-8 w-8 text-gold-300" aria-hidden />
        <p className="mt-4 font-display text-4xl tracking-wide">Photos are on the way</p>
        <p className="mt-2 max-w-sm text-sm text-mute">Recaps from the latest Bombita nights land here soon after each party.</p>
      </div>
    );
  }

  const total = albums.reduce((n, a) => n + a.count, 0);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <label className="relative w-full sm:w-auto">
          <span className="sr-only">Filter albums</span>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setShown(ALBUM_STEP);
              setQuery({ category: e.target.value || null });
            }}
            className="h-12 w-full appearance-none border border-white/20 bg-ink-950 pl-4 pr-10 text-sm font-semibold text-white focus:border-gold-300 focus:outline-none sm:min-w-64"
          >
            <option value="">All nights ({albums.length})</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({albums.filter((a) => a.category === c.name).length})
              </option>
            ))}
          </select>
          <span aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gold-300">▾</span>
        </label>
        <p className="text-xs uppercase tracking-[0.22em] text-mute">
          {albums.length} {albums.length === 1 ? "night" : "nights"} · {total} photos
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-1.5 md:grid-cols-3 md:gap-3 xl:grid-cols-4">
        {list.slice(0, shown).map((a, i) => (
          <li key={a.date}>
            <AlbumCard album={a} eager={i < 4} onOpen={() => setQuery({ album: a.date })} />
          </li>
        ))}
      </ul>
      {list.length > shown && (
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={() => setShown((n) => n + ALBUM_STEP)} className="h-12 border border-white/25 px-6 text-xs font-bold uppercase tracking-[0.2em] text-white hover:border-gold-400 hover:text-gold-300">
            Show more albums ({list.length - shown} more)
          </button>
        </div>
      )}
      {list.length === 0 && <p className={cn("border border-dashed border-white/15 p-10 text-center text-mute")}>No nights in this category yet.</p>}

      {openAlbum && <AlbumSheet key={openAlbum.date} album={openAlbum} onClose={close} />}
    </div>
  );
}
