"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Camera, Loader2, Play, RotateCcw } from "lucide-react";
import type { GalleryFacets, GalleryFilters, GalleryItem, GalleryPage } from "@/lib/media/types";
import { cn } from "@/lib/utils";
import { MediaLightbox, longDate } from "./MediaLightbox";
import { GallerySkeleton } from "./GallerySkeleton";

const qs = (f: GalleryFilters, extra: Record<string, string> = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) p.set(k, String(v));
  return p.toString();
};

const shortDate = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** One tile in a justified row: flex-grow ∝ aspect ratio keeps every photo uncropped and rows even. */
const Tile = memo(function Tile({ item, eager, onOpen }: { item: GalleryItem; eager: boolean; onOpen: () => void }) {
  const ratio = item.width && item.height ? Math.min(Math.max(item.width / item.height, 0.5), 2.4) : 1;
  const label = item.title || item.caption || `${item.type === "video" ? "Video" : "Photo"} from ${shortDate(item.date)}`;
  const srcSet = [item.thumb.w && `${item.thumb.url} ${item.thumb.w}w`, item.display?.w && `${item.display.url} ${item.display.w}w`].filter(Boolean).join(", ");
  const poster = item.type === "video" ? (item.poster ?? item.thumb) : item.thumb;
  return (
    <button
      type="button"
      onClick={onOpen}
      data-cursor={item.type === "video" ? "Play" : "View"}
      aria-label={`Open ${label}`}
      className="group relative overflow-hidden bg-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
      style={{ flexGrow: ratio, flexBasis: `calc(${ratio} * var(--row-h))` }}
    >
      <span className="block" style={{ paddingBottom: `${100 / ratio}%` }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-optimized WebP renditions straight from the CDN */}
      <img
        src={poster.url}
        srcSet={item.type === "image" && srcSet ? srcSet : undefined}
        sizes={`(min-width: 1280px) ${Math.round(ratio * 340)}px, (min-width: 768px) ${Math.round(ratio * 290)}px, ${Math.round(ratio * 240)}px`}
        alt={label}
        width={poster.w ?? undefined}
        height={poster.h ?? undefined}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-[1.04]"
      />
      {item.type === "video" && (
        <span className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-ink-950/70 via-transparent to-transparent p-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-400 text-ink-950">
            <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden />
          </span>
          {item.duration != null && <span className="text-xs font-semibold tabular-nums text-white">{fmtDuration(item.duration)}</span>}
        </span>
      )}
    </button>
  );
});

export function DateGallery({ initial, facets, filters }: { initial: GalleryPage; facets: GalleryFacets; filters: GalleryFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  const setFilter = (next: Partial<GalleryFilters>) => {
    const merged = { ...filters, ...next };
    startTransition(() => router.replace(`${pathname}${qs(merged) ? `?${qs(merged)}` : ""}`, { scroll: false }));
  };

  const loadMore = useCallback(async () => {
    if (!cursor || inFlight.current) return;
    inFlight.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetch(`/api/gallery?${qs(filters, { cursor, limit: "36" })}`);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? `HTTP ${res.status}`);
      const page = (await res.json()) as GalleryPage;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
      });
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load more.");
    } finally {
      inFlight.current = false;
      setLoadingMore(false);
    }
  }, [cursor, filters]);

  // Infinite scroll: start fetching ~1.5 screens before the end.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || error) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && loadMore(), { rootMargin: "150% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore, error]);

  const groups = useMemo(() => {
    const out: { date: string; items: { item: GalleryItem; index: number }[] }[] = [];
    items.forEach((item, index) => {
      const last = out.at(-1);
      if (last?.date === item.date) last.items.push({ item, index });
      else out.push({ date: item.date, items: [{ item, index }] });
    });
    return out;
  }, [items]);
  const countFor = useMemo(() => new Map(facets.dates.map((d) => [d.date, d])), [facets.dates]);
  const filtered = Boolean(filters.date || filters.type || filters.category || filters.tag || filters.from || filters.to);
  const shownTotal = filters.date ? (countFor.get(filters.date)?.count ?? 0) : facets.total;

  return (
    <div>
      {/* ── Filters (state lives in the URL → shareable) ── */}
      <div className="mb-8 border-b border-white/10 pb-4 md:border-0 md:pb-0">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div role="group" aria-label="Media type" className="flex border border-white/15">
            {([["", "All"], ["image", "Photos"], ["video", "Videos"]] as const).map(([v, l]) => (
              <button
                key={l}
                type="button"
                onClick={() => setFilter({ type: (v || undefined) as GalleryFilters["type"] })}
                aria-pressed={(filters.type ?? "") === v}
                className={cn("h-10 px-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] transition-colors", (filters.type ?? "") === v ? "bg-gold-400 text-ink-950" : "text-white/75 hover:text-white")}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="relative">
            <span className="sr-only">Date</span>
            <select
              value={filters.date ?? ""}
              onChange={(e) => setFilter({ date: e.target.value || undefined })}
              className="h-10 appearance-none border border-white/15 bg-ink-950 pl-3 pr-9 text-xs font-semibold uppercase tracking-[0.14em] text-white focus:border-gold-300 focus:outline-none"
            >
              <option value="">All dates ({facets.total})</option>
              {facets.dates.map((d) => (
                <option key={d.date} value={d.date}>
                  {shortDate(d.date)} ({d.count})
                </option>
              ))}
            </select>
            <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold-300">▾</span>
          </label>
          {facets.categories.length > 0 && (
            <label className="relative">
              <span className="sr-only">Category</span>
              <select
                value={filters.category ?? ""}
                onChange={(e) => setFilter({ category: e.target.value || undefined })}
                className="h-10 appearance-none border border-white/15 bg-ink-950 pl-3 pr-9 text-xs font-semibold uppercase tracking-[0.14em] text-white focus:border-gold-300 focus:outline-none"
              >
                <option value="">All categories</option>
                {facets.categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
              <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold-300">▾</span>
            </label>
          )}
          {filtered && (
            <button type="button" onClick={() => setFilter({ date: undefined, type: undefined, category: undefined, tag: undefined, from: undefined, to: undefined })} className="h-10 px-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-300 hover:text-gold-200">
              Clear
            </button>
          )}
          <span className="ml-auto hidden text-xs text-mute md:inline" aria-live="polite">
            {pending ? "Loading…" : `${shownTotal} ${shownTotal === 1 ? "item" : "items"}`}
          </span>
        </div>
        {facets.tags.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {facets.tags.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setFilter({ tag: filters.tag === t.slug ? undefined : t.slug })}
                aria-pressed={filters.tag === t.slug}
                className={cn("h-8 shrink-0 border px-3 text-[0.6rem] font-bold uppercase tracking-[0.18em]", filters.tag === t.slug ? "border-gold-400 bg-gold-400 text-ink-950" : "border-white/15 text-white/70 hover:border-white/40")}
              >
                #{t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {pending ? (
        <GallerySkeleton rows={3} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center border border-dashed border-white/15 px-6 py-20 text-center">
          <Camera className="h-8 w-8 text-gold-300" aria-hidden />
          <p className="mt-4 font-display text-4xl tracking-wide">{filtered ? "Nothing matches" : "Photos are on the way"}</p>
          <p className="mt-2 max-w-sm text-sm text-mute">
            {filtered ? "Try another date or clear the filters." : "Recaps from the latest Bombita nights land here soon after each party."}
          </p>
          {filtered && (
            <button type="button" onClick={() => setFilter({ date: undefined, type: undefined, category: undefined, tag: undefined })} className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-gold-300">
              Show everything
            </button>
          )}
        </div>
      ) : (
        <div className="[--row-h:190px] sm:[--row-h:200px] md:[--row-h:220px] xl:[--row-h:260px]">
          {groups.map((g) => {
            const summary = countFor.get(g.date);
            return (
              <section key={g.date} aria-labelledby={`d-${g.date}`} className="mb-12">
                <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/10 pb-3">
                  <h3 id={`d-${g.date}`} className="font-display text-3xl uppercase tracking-wide md:text-4xl">
                    {longDate(g.date)}
                  </h3>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-gold-300">
                    {summary ? `${summary.images ? `${summary.images} photo${summary.images === 1 ? "" : "s"}` : ""}${summary.images && summary.videos ? " · " : ""}${summary.videos ? `${summary.videos} video${summary.videos === 1 ? "" : "s"}` : ""}` : `${g.items.length}`}
                  </p>
                </header>
                <div className="flex flex-wrap gap-1 md:gap-1.5">
                  {g.items.map(({ item, index }) => (
                    <Tile key={item.id} item={item} eager={index < 6} onOpen={() => setOpen(index)} />
                  ))}
                  {/* filler keeps the last row from stretching */}
                  <span aria-hidden style={{ flexGrow: 999999, flexBasis: 0 }} />
                </div>
              </section>
            );
          })}

          <div ref={sentinel} />
          {loadingMore && <GallerySkeleton rows={1} heading={false} />}
          {error && (
            <div role="alert" className="mt-6 flex flex-col items-center gap-3 border border-red-400/30 bg-red-500/5 p-6 text-center text-sm text-red-200">
              <AlertTriangle className="h-5 w-5" aria-hidden />
              Couldn&apos;t load more photos ({error}).
              <button type="button" onClick={loadMore} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-300">
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
            </div>
          )}
          {cursor && !loadingMore && !error && (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={loadMore} className="flex h-12 items-center gap-2 border border-white/20 px-6 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white hover:border-gold-400">
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Load more
              </button>
            </div>
          )}
          {!cursor && items.length > 0 && <p className="mt-6 text-center text-xs uppercase tracking-[0.24em] text-mute-2">That&apos;s everything — see you at the next one.</p>}
        </div>
      )}

      <MediaLightbox items={items} index={open} total={shownTotal} onNearEnd={loadMore} onChange={setOpen} onClose={() => setOpen(null)} />
    </div>
  );
}
