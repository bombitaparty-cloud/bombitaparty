"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckSquare, Eye, EyeOff, Film, Image as ImageIcon, Loader2, Pencil, RefreshCw, Search, Square, Tag, Trash2, X } from "lucide-react";
import type { AdminMediaItem, MediaStats } from "@/lib/media/types";
import { cn } from "@/lib/utils";
import { CATEGORY_SUGGESTIONS } from "./constants";
import { MediaUploader } from "./MediaUploader";
import { adminFetch, formatBytes } from "./client";

interface ListResponse {
  items: AdminMediaItem[];
  total: number;
  page: number;
  pageSize: number;
}
type Filters = { q: string; status: string; visibility: string; type: string; date: string; sort: string; page: number };
const EMPTY: Filters = { q: "", status: "", visibility: "", type: "", date: "", sort: "date_desc", page: 1 };

const STATUS_STYLE: Record<string, string> = {
  ready: "border-emerald-400/40 text-emerald-300",
  processing: "border-gold-400/50 text-gold-300",
  pending: "border-white/20 text-white/60",
  failed: "border-red-400/50 text-red-300",
};

function Confirm({ text, onYes, onNo, busy }: { text: string; onYes: () => void; onNo: () => void; busy: boolean }) {
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Confirm" className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-950/80 p-4">
      <div className="w-full max-w-sm border border-red-400/40 bg-ink-900 p-6">
        <p className="text-sm text-white">{text}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onNo} disabled={busy} className="h-10 px-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/70">
            Cancel
          </button>
          <button type="button" onClick={onYes} disabled={busy} className="flex h-10 items-center gap-2 bg-red-500 px-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Editor({ item, onClose, onSaved }: { item: AdminMediaItem; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: item.title ?? "",
    caption: item.caption ?? "",
    description: item.description ?? "",
    category: item.category ?? "",
    galleryDate: item.date,
    displayOrder: String(item.displayOrder),
    tags: item.tags.map((t) => t.name).join(", "),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const next = f.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const before = item.tags.map((t) => t.name);
      await adminFetch("/api/admin/media", {
        method: "PATCH",
        body: JSON.stringify({
          ids: [item.id],
          patch: {
            title: f.title,
            caption: f.caption,
            description: f.description,
            category: f.category,
            ...(f.galleryDate !== item.date ? { galleryDate: f.galleryDate } : {}),
            displayOrder: Number(f.displayOrder) || 0,
            addTags: next.filter((t) => !before.includes(t)),
            removeTags: before.filter((t) => !next.includes(t)),
          },
        }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full border border-white/15 bg-ink-950 px-3 py-2 text-sm text-white focus:border-gold-300 focus:outline-none";
  return (
    <div role="dialog" aria-modal="true" aria-label={`Edit ${item.originalFilename}`} className="fixed inset-0 z-[150] flex justify-end bg-ink-950/70" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-ink-900 p-5 md:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{item.originalFilename}</p>
            <p className="text-xs text-mute">
              {item.status} · {item.visibility} · {formatBytes(item.fileSizeBytes)} original · {formatBytes(item.webBytes)} web
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close editor" className="text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden border border-white/10 bg-black">
          {item.type === "video" && item.video ? (
            <video src={item.video.url} poster={item.poster?.url ?? item.thumb.url} controls playsInline preload="metadata" className="max-h-[50vh] w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview through the authorized media endpoint
            <img src={(item.display ?? item.thumb).url} alt="" className="max-h-[50vh] w-full object-contain" />
          )}
        </div>
        {item.error && <p className="mt-3 border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-200">Processing error: {item.error}</p>}

        <div className="mt-5 grid gap-4">
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
            Title
            <input value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} className={field} />
          </label>
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
            Caption
            <input value={f.caption} maxLength={500} onChange={(e) => setF({ ...f, caption: e.target.value })} className={field} />
          </label>
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
            Description
            <textarea value={f.description} maxLength={4000} rows={3} onChange={(e) => setF({ ...f, description: e.target.value })} className={cn(field, "resize-y")} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
              Gallery date
              <input type="date" value={f.galleryDate} onChange={(e) => setF({ ...f, galleryDate: e.target.value })} className={cn(field, "[color-scheme:dark]")} />
            </label>
            <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
              Order within date
              <input type="number" value={f.displayOrder} onChange={(e) => setF({ ...f, displayOrder: e.target.value })} className={field} />
            </label>
          </div>
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
            Category
            <input list="lib-cats" value={f.category} maxLength={60} onChange={(e) => setF({ ...f, category: e.target.value })} className={field} />
            <datalist id="lib-cats">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
            Tags (comma separated)
            <input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} className={field} />
          </label>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt className="text-mute">Captured</dt>
          <dd className="text-white/80">{item.capturedAt ? new Date(item.capturedAt).toLocaleString("en-US", { timeZone: "America/New_York" }) + " NY" : "—"}</dd>
          <dt className="text-mute">Date source</dt>
          <dd className="text-white/80">{item.dateSource}</dd>
          <dt className="text-mute">Dimensions</dt>
          <dd className="text-white/80">{item.width && item.height ? `${item.width} × ${item.height}` : "—"}{item.duration ? ` · ${item.duration.toFixed(1)} s` : ""}</dd>
          <dt className="text-mute">Uploaded</dt>
          <dd className="text-white/80">{new Date(item.uploadedAt).toLocaleString("en-US", { timeZone: "America/New_York" })}</dd>
          <dt className="text-mute">SHA-256</dt>
          <dd className="truncate font-mono text-white/60" title={item.checksum}>{item.checksum}</dd>
        </dl>

        {err && <p role="alert" className="mt-4 text-sm text-red-300">{err}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 px-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/70">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={busy} className="flex h-11 items-center gap-2 bg-gold-400 px-5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-950 hover:bg-gold-300 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function fetchMedia(f: Filters) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, String(v));
  return Promise.all([adminFetch<ListResponse>(`/api/admin/media?${p}`), adminFetch<MediaStats>("/api/admin/media/stats")]);
}

export function MediaLibrary({ storage, flow, access }: { storage: "blob" | "local" | "readonly"; flow: "token" | "presigned"; access: "public" | "private" }) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [q, setQ] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AdminMediaItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [bulkDate, setBulkDate] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkTag, setBulkTag] = useState("");

  const [tick, setTick] = useState(0);

  // Fetch on every filter change / refresh; stale responses are discarded.
  useEffect(() => {
    let live = true;
    fetchMedia(filters)
      .then(([list, s]) => {
        if (!live) return;
        setData(list);
        setStats(s);
        setError(null);
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load media"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [filters, tick]);

  /** Change filters from an event handler (shows the loading state immediately). */
  const update = useCallback((next: Partial<Filters>) => {
    setLoading(true);
    setFilters((f) => ({ ...f, ...next }));
  }, []);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === q ? f : { ...f, q, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const refresh = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);
  const ids = useMemo(() => [...selected], [selected]);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function bulk(patch: Record<string, unknown>, label: string) {
    if (!ids.length) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch<{ updated: string[]; skipped: string[]; note?: string }>("/api/admin/media", { method: "PATCH", body: JSON.stringify({ ids, patch }) });
      setNotice(`${label}: ${res.updated.length} updated${res.skipped.length ? `, ${res.skipped.length} skipped${res.note ? ` (${res.note})` : ""}` : ""}.`);
      refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await adminFetch<{ deleted: string[]; orphanedFiles: number }>("/api/admin/media", { method: "DELETE", body: JSON.stringify({ ids }) });
      setNotice(`Deleted ${res.deleted.length} asset(s)${res.orphanedFiles ? ` — ${res.orphanedFiles} file(s) could not be removed from storage (logged)` : ""}.`);
      setSelected(new Set());
      setConfirmDelete(false);
      refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const sel = "h-10 border border-white/15 bg-ink-950 px-2 text-xs text-white focus:border-gold-300 focus:outline-none";
  const usage = stats ? Math.min(1, stats.blobBytes / stats.budgetBytes) : 0;

  return (
    <div className="space-y-8">
      {stats && (
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Assets", stats.total],
            ["Published", stats.published],
            ["Drafts", stats.drafts],
            ["Dates", stats.dates],
            ["Photos / videos", `${stats.images} / ${stats.videos}`],
            ["Processing / failed", `${stats.byStatus.processing} / ${stats.byStatus.failed}`],
          ].map(([k, v]) => (
            <div key={k} className="border border-white/10 bg-ink-900/60 p-4">
              <dt className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-mute">{k}</dt>
              <dd className="mt-2 font-display text-3xl">{v}</dd>
            </div>
          ))}
          <div className="col-span-2 border border-white/10 bg-ink-900/60 p-4 md:col-span-3 xl:col-span-6">
            <dt className="flex flex-wrap justify-between gap-2 text-[0.6rem] font-bold uppercase tracking-[0.22em] text-mute">
              <span>Storage · web renditions</span>
              <span className="normal-case tracking-normal">
                {formatBytes(stats.webBytes)} total · {formatBytes(stats.blobBytes)} in Vercel Blob of a {formatBytes(stats.budgetBytes)} budget · originals {formatBytes(stats.originalBytes)} (kept off the CDN)
              </span>
            </dt>
            <dd className="mt-3 h-2 bg-white/10">
              <span className={cn("block h-full", usage > 0.85 ? "bg-red-400" : "bg-gold-400")} style={{ width: `${Math.max(usage * 100, 1)}%` }} />
            </dd>
          </div>
        </dl>
      )}

      <MediaUploader storage={storage} flow={flow} access={access} onDone={refresh} />

      <section aria-labelledby="lib-title">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="lib-title" className="mr-auto text-[0.65rem] font-bold uppercase tracking-[0.24em] text-gold-300">
            Library {data ? `· ${data.total}` : ""}
          </h2>
          <label className="flex h-10 items-center gap-2 border border-white/15 bg-ink-950 px-2">
            <Search className="h-4 w-4 text-white/50" aria-hidden />
            <span className="sr-only">Search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filename, title, caption" className="w-44 bg-transparent text-xs text-white focus:outline-none" />
          </label>
          <select aria-label="Status" value={filters.status} onChange={(e) => update({ status: e.target.value, page: 1 })} className={sel}>
            <option value="">Any status</option>
            {["ready", "processing", "pending", "failed"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Visibility" value={filters.visibility} onChange={(e) => update({ visibility: e.target.value, page: 1 })} className={sel}>
            <option value="">Published + drafts</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
          <select aria-label="Type" value={filters.type} onChange={(e) => update({ type: e.target.value, page: 1 })} className={sel}>
            <option value="">Photos + videos</option>
            <option value="image">Photos</option>
            <option value="video">Videos</option>
          </select>
          <input aria-label="Date" type="date" value={filters.date} onChange={(e) => update({ date: e.target.value, page: 1 })} className={cn(sel, "[color-scheme:dark]")} />
          <select aria-label="Sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className={sel}>
            <option value="date_desc">Newest date</option>
            <option value="date_asc">Oldest date</option>
            <option value="uploaded_desc">Recently uploaded</option>
            <option value="name_asc">Filename</option>
          </select>
          <button type="button" onClick={refresh} aria-label="Refresh" className="flex h-10 w-10 items-center justify-center border border-white/15 text-white/70 hover:text-white">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Bulk actions */}
        <div className={cn("sticky top-16 z-30 mt-3 flex flex-wrap items-center gap-2 border p-2", ids.length ? "border-gold-400/50 bg-ink-900" : "border-white/10 bg-ink-950")}>
          <button type="button" onClick={() => setSelected(ids.length === data?.items.length ? new Set() : new Set(data?.items.map((i) => i.id)))} className="flex h-9 items-center gap-2 px-2 text-xs text-white/80">
            {ids.length && ids.length === data?.items.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            {ids.length ? `${ids.length} selected` : "Select page"}
          </button>
          <button type="button" disabled={!ids.length || busy} onClick={() => bulk({ visibility: "published" }, "Published")} className="flex h-9 items-center gap-1.5 bg-emerald-500/90 px-3 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ink-950 disabled:opacity-40">
            <Eye className="h-4 w-4" /> Publish
          </button>
          <button type="button" disabled={!ids.length || busy} onClick={() => bulk({ visibility: "draft" }, "Unpublished")} className="flex h-9 items-center gap-1.5 border border-white/20 px-3 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white disabled:opacity-40">
            <EyeOff className="h-4 w-4" /> Unpublish
          </button>
          <span className="flex items-center gap-1">
            <input aria-label="New date for selected" type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className="h-9 border border-white/15 bg-ink-950 px-2 text-xs text-white [color-scheme:dark]" />
            <button type="button" disabled={!ids.length || !bulkDate || busy} onClick={() => bulk({ galleryDate: bulkDate }, "Date changed")} className="flex h-9 items-center gap-1 border border-white/20 px-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white disabled:opacity-40">
              <CalendarDays className="h-4 w-4" /> Set date
            </button>
          </span>
          <span className="flex items-center gap-1">
            <input aria-label="Category for selected" list="lib-cats-bulk" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} placeholder="Category" className="h-9 w-32 border border-white/15 bg-ink-950 px-2 text-xs text-white" />
            <datalist id="lib-cats-bulk">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
            <button type="button" disabled={!ids.length || busy} onClick={() => bulk({ category: bulkCategory }, "Category set")} className="h-9 border border-white/20 px-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white disabled:opacity-40">
              Set
            </button>
          </span>
          <span className="flex items-center gap-1">
            <input aria-label="Tag for selected" value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="Tag" className="h-9 w-28 border border-white/15 bg-ink-950 px-2 text-xs text-white" />
            <button type="button" disabled={!ids.length || !bulkTag.trim() || busy} onClick={() => bulk({ addTags: [bulkTag.trim()] }, "Tag added")} className="flex h-9 items-center gap-1 border border-white/20 px-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white disabled:opacity-40">
              <Tag className="h-4 w-4" /> Add
            </button>
          </span>
          <button type="button" disabled={!ids.length || busy} onClick={() => setConfirmDelete(true)} className="ml-auto flex h-9 items-center gap-1.5 border border-red-400/50 px-3 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-red-300 disabled:opacity-40">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
        {notice && <p role="status" className="mt-2 text-sm text-gold-200">{notice}</p>}
        {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}

        {!data && loading ? (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {Array.from({ length: 16 }, (_, i) => <div key={i} className="aspect-square animate-pulse bg-white/[0.05]" />)}
          </div>
        ) : data && data.items.length === 0 ? (
          <p className="mt-6 border border-dashed border-white/15 p-10 text-center text-mute">No media matches. Upload above, or run the import script (README → Media).</p>
        ) : (
          <ul className={cn("mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8", loading && "opacity-60")}>
            {data?.items.map((it) => {
              const on = selected.has(it.id);
              return (
                <li key={it.id} className={cn("group relative aspect-square overflow-hidden border bg-ink-900", on ? "border-gold-400" : "border-white/10")}>
                  <button type="button" onClick={() => toggle(it.id)} aria-pressed={on} aria-label={`Select ${it.originalFilename}`} className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails via the authorized endpoint */}
                    <img src={it.thumb.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </button>
                  <span className="pointer-events-none absolute left-1 top-1 flex gap-1">
                    <span className={cn("border bg-ink-950/80 px-1 text-[0.5rem] font-bold uppercase", STATUS_STYLE[it.status])}>{it.status}</span>
                    {it.visibility === "draft" && <span className="border border-white/20 bg-ink-950/80 px-1 text-[0.5rem] font-bold uppercase text-white/70">draft</span>}
                  </span>
                  {it.type === "video" && <Film className="pointer-events-none absolute bottom-1 left-1 h-4 w-4 text-white drop-shadow" aria-label="Video" />}
                  {it.type === "image" && <ImageIcon className="pointer-events-none absolute bottom-1 left-1 h-3.5 w-3.5 text-white/0 group-hover:text-white/80" aria-hidden />}
                  <span className="pointer-events-none absolute right-1 top-1">{on ? <CheckSquare className="h-4 w-4 text-gold-300" /> : <Square className="h-4 w-4 text-white/0 group-hover:text-white/70" />}</span>
                  <button type="button" onClick={() => setEditing(it)} aria-label={`Edit ${it.originalFilename}`} className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center bg-ink-950/80 text-white opacity-80 hover:opacity-100">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-950/90 px-1 pb-1 pt-4 text-[0.55rem] text-white/80 opacity-0 group-hover:opacity-100">
                    {it.date} · {it.originalFilename}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {data && pages > 1 && (
          <nav aria-label="Pages" className="mt-4 flex items-center justify-center gap-3 text-xs">
            <button type="button" disabled={filters.page <= 1} onClick={() => update({ page: filters.page - 1 })} className="h-9 border border-white/15 px-3 disabled:opacity-40">
              Previous
            </button>
            <span className="text-mute">
              Page {filters.page} of {pages}
            </span>
            <button type="button" disabled={filters.page >= pages} onClick={() => update({ page: filters.page + 1 })} className="h-9 border border-white/15 px-3 disabled:opacity-40">
              Next
            </button>
          </nav>
        )}
      </section>

      {editing && <Editor item={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {confirmDelete && (
        <Confirm
          text={`Permanently delete ${ids.length} asset(s)? Their web files are removed from storage. Original files on your computer are not affected.`}
          busy={busy}
          onNo={() => setConfirmDelete(false)}
          onYes={remove}
        />
      )}
    </div>
  );
}
