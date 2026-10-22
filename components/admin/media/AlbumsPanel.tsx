"use client";

import { useEffect, useState } from "react";
import { FolderOpen, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { AdminAlbum } from "@/lib/media/queries";
import { cn } from "@/lib/utils";
import { CATEGORY_SUGGESTIONS } from "./constants";
import { adminFetch } from "./client";

const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

type Draft = { date: string; title: string; venue: string; city: string; category: string; description: string };
const blank: Draft = { date: "", title: "", venue: "", city: "New York", category: "", description: "" };

/**
 * Albums = gallery nights. The admin names a night, uploads into it and picks
 * its thumbnail (open a photo below → "Use as album cover"). Albums without
 * published photos stay hidden on the public gallery.
 */
export function AlbumsPanel({
  refreshKey,
  onUpload,
  onView,
}: {
  refreshKey: number;
  onUpload: (album: { date: string; title: string | null }) => void;
  onView: (date: string) => void;
}) {
  const [albums, setAlbums] = useState<AdminAlbum[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    adminFetch<{ albums: AdminAlbum[] }>("/api/admin/albums")
      .then((r) => live && (setAlbums(r.albums), setError(null)))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load albums"));
    return () => {
      live = false;
    };
  }, [refreshKey, tick]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/albums", { method: "PUT", body: JSON.stringify(draft) });
      setDraft(null);
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(a: AdminAlbum) {
    if (!window.confirm(`Remove the album details for ${longDate(a.date)}? Its ${a.total} photo(s) stay in the library.`)) return;
    try {
      await adminFetch("/api/admin/albums", { method: "DELETE", body: JSON.stringify({ date: a.date }) });
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const field = "mt-1 h-10 w-full border border-white/15 bg-ink-950 px-2 text-sm normal-case tracking-normal text-white focus:border-gold-300 focus:outline-none";

  return (
    <section aria-labelledby="albums-title" className="border border-white/10 bg-ink-900/50 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="albums-title" className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.24em] text-gold-300">
          <FolderOpen className="h-4 w-4" /> Albums (one per night)
        </h2>
        <button
          type="button"
          onClick={() => setDraft(draft ? null : { ...blank })}
          className="flex h-10 items-center gap-2 bg-gold-400 px-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-950 hover:bg-gold-300"
        >
          {draft ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {draft ? "Cancel" : "New album"}
        </button>
      </div>
      <p className="mt-2 text-xs text-mute-2">
        Create the night, upload its photos into it, then open any photo in the library and choose <em>Use as album cover</em> to set the thumbnail.
      </p>

      {draft && (
        <div className="mt-4 grid gap-3 border border-gold-400/30 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute lg:col-span-1">
            Night
            <input type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={cn(field, "[color-scheme:dark]")} />
          </label>
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute lg:col-span-2">
            Title
            <input value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Raulin Rodriguez" className={field} />
          </label>
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
            Venue
            <input value={draft.venue} maxLength={120} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} placeholder="e.g. Radio Hotel" className={field} />
          </label>
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
            City
            <input value={draft.city} maxLength={60} onChange={(e) => setDraft({ ...draft, city: e.target.value })} className={field} />
          </label>
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
            Category
            <input list="album-cats" value={draft.category} maxLength={60} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Bombita Nights" className={field} />
            <datalist id="album-cats">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute sm:col-span-2 lg:col-span-5">
            Description (optional)
            <input value={draft.description} maxLength={2000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={field} />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={save}
              disabled={busy || !draft.date || !draft.title.trim()}
              className="flex h-10 w-full items-center justify-center gap-2 bg-gold-400 px-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-950 hover:bg-gold-300 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save album
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}

      {!albums ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse bg-white/[0.05]" />)}
        </div>
      ) : albums.length === 0 ? (
        <p className="mt-4 border border-dashed border-white/15 p-6 text-center text-sm text-mute">No albums yet — click New album to add a night.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {albums.map((a) => (
            <li key={a.date} className="flex flex-col border border-white/10 bg-ink-950">
              <div className="relative aspect-[4/5] overflow-hidden bg-ink-900">
                {a.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail via the authorized media endpoint
                  <img src={a.thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-mute">
                    <ImagePlus className="h-6 w-6 text-gold-300" aria-hidden /> No photos yet
                  </span>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-transparent to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-2">
                  <span className="block font-display text-xl uppercase leading-none tracking-wide">{a.title ?? <span className="text-white/50">Untitled night</span>}</span>
                  <span className="mt-1 block text-[0.65rem] text-white/75">
                    {longDate(a.date)}
                    {a.venue ? ` · ${a.venue}` : ""}
                  </span>
                </span>
                {!a.coverAssetId && a.thumb && (
                  <span className="absolute left-1 top-1 bg-ink-950/80 px-1 text-[0.5rem] font-bold uppercase text-white/60">auto cover</span>
                )}
              </div>
              <p className="px-2 pt-2 text-[0.65rem] text-mute">
                {a.total} photo{a.total === 1 ? "" : "s"} · {a.published} published{a.published === 0 ? " · hidden on site" : ""}
              </p>
              <div className="flex flex-wrap gap-1 p-2">
                <button type="button" onClick={() => onUpload({ date: a.date, title: a.title })} className="flex h-8 items-center gap-1 bg-gold-400 px-2 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-ink-950">
                  <ImagePlus className="h-3.5 w-3.5" /> Upload
                </button>
                {a.total > 0 && (
                  <button type="button" onClick={() => onView(a.date)} className="h-8 border border-white/20 px-2 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-white">
                    Photos
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Edit album ${a.date}`}
                  onClick={() => setDraft({ date: a.date, title: a.title ?? "", venue: a.venue ?? "", city: a.city, category: a.category ?? "", description: a.description ?? "" })}
                  className="flex h-8 w-8 items-center justify-center border border-white/20 text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {a.saved && (
                  <button type="button" aria-label={`Remove album details ${a.date}`} onClick={() => remove(a)} className="flex h-8 w-8 items-center justify-center border border-red-400/40 text-red-300">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
