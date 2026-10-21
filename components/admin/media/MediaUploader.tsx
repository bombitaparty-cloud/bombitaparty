"use client";

import { useRef, useState, type DragEvent } from "react";
import { upload, uploadPresigned } from "@vercel/blob/client";
import { AlertCircle, CheckCircle2, Copy, FolderUp, ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_SUGGESTIONS } from "./constants";
import { adminFetch, downscaleImage, exifCapture, folderDate, formatBytes, postWithProgress, sha256Hex, videoFacts } from "./client";

type Status = "queued" | "reading" | "duplicate" | "needs-date" | "uploading" | "done" | "failed";
interface Job {
  key: string;
  file: File;
  path: string;
  status: Status;
  progress: number;
  message?: string;
  date?: string | null;
  dateSource?: "event" | "capture" | "directory" | "manual";
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/quicktime,video/webm";
const MAX_VIDEO = 200 * 1024 * 1024;
const CONCURRENCY = 3;

/**
 * Bulk / date-wise upload. Date per file: event date (if set) → photo EXIF
 * capture date → YYYY-MM-DD folder name → the fallback date. Files with no
 * date and no fallback wait for one instead of getting a made-up date.
 */
export function MediaUploader({ storage, flow, access, onDone }: { storage: "blob" | "local" | "readonly"; flow: "token" | "presigned"; access: "public" | "private"; onDone: () => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [eventDate, setEventDate] = useState("");
  const [fallbackDate, setFallbackDate] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [publish, setPublish] = useState(false);
  const [running, setRunning] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const patch = (key: string, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.key === key ? { ...j, ...p } : j)));

  function add(list: FileList | File[]) {
    const next: Job[] = [];
    for (const file of Array.from(list)) {
      if (!ACCEPT.split(",").includes(file.type) && !/\.(jpe?g|png|webp|avif|gif|mp4|mov|webm)$/i.test(file.name)) continue;
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      next.push({ key: `${path}:${file.size}:${file.lastModified}`, file, path, status: "queued", progress: 0 });
    }
    setJobs((js) => {
      const have = new Set(js.map((j) => j.key));
      return [...js, ...next.filter((j) => !have.has(j.key))];
    });
  }

  async function processJob(job: Job, checksum: string) {
    const isVideo = job.file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(job.file.name);
    let captured: { capturedAt: string | null; localDate: string | null } = { capturedAt: null, localDate: null };
    if (!isVideo) captured = await exifCapture(job.file);
    const dir = folderDate(job.path);
    const [date, dateSource] = eventDate
      ? [eventDate, "event" as const]
      : captured.localDate
        ? [captured.localDate, "capture" as const]
        : dir
          ? [dir, "directory" as const]
          : fallbackDate
            ? [fallbackDate, "manual" as const]
            : [null, null];
    if (!date || !dateSource) {
      patch(job.key, { status: "needs-date", message: "No date in the photo or folder — set a fallback date and retry." });
      return;
    }
    patch(job.key, { status: "uploading", progress: 0.05, date, dateSource });

    const form = new FormData();
    const meta: Record<string, unknown> = {
      originalFilename: job.file.name,
      originalMime: job.file.type || (isVideo ? "video/mp4" : "image/jpeg"),
      originalSize: job.file.size,
      checksum,
      capturedAt: captured.capturedAt,
      galleryDate: date,
      dateSource,
      category: category || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      publish,
    };
    if (isVideo) {
      if (job.file.size > MAX_VIDEO) throw new Error(`Videos are limited to ${MAX_VIDEO / 1024 / 1024} MB — compress it first.`);
      const facts = await videoFacts(job.file);
      Object.assign(meta, { originalWidth: facts.width, originalHeight: facts.height, durationSeconds: facts.duration });
      form.append("file", facts.poster, "poster.jpg");
      if (storage === "blob") {
        const pathname = `media/uploads/${date}/${job.file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-")}`;
        const onUploadProgress = ({ percentage }: { percentage: number }) => patch(job.key, { progress: 0.05 + (percentage / 100) * 0.8 });
        const blob =
          flow === "presigned"
            ? await uploadPresigned(pathname, job.file, { access, handleUploadUrl: "/api/admin/upload", contentType: job.file.type, onUploadProgress })
            : await upload(pathname, job.file, { access, handleUploadUrl: "/api/admin/upload", onUploadProgress });
        meta.videoUrl = blob.url;
      } else {
        if (job.file.size > 3.8 * 1024 * 1024) throw new Error("Local storage mode only accepts videos under 4 MB.");
        form.append("video", job.file);
      }
    } else {
      const small = await downscaleImage(job.file);
      Object.assign(meta, { originalWidth: small.width, originalHeight: small.height });
      form.append("file", small.blob, job.file.name.replace(/\.\w+$/, small.blob.type === "image/webp" ? ".webp" : ".jpg"));
    }
    form.append("meta", JSON.stringify(meta));
    const base = isVideo && storage === "blob" ? 0.85 : 0.05;
    const res = await postWithProgress<{ status: "imported" | "duplicate"; id: string }>("/api/admin/media", form, (f) => patch(job.key, { progress: base + f * (0.98 - base) }));
    patch(job.key, { status: res.status === "duplicate" ? "duplicate" : "done", progress: 1, message: res.status === "duplicate" ? "Already in the library" : undefined });
  }

  async function start() {
    const todo = jobs.filter((j) => j.status === "queued" || j.status === "failed" || j.status === "needs-date");
    if (!todo.length) return;
    setRunning(true);
    try {
      // 1. checksums + duplicate check in one request
      const sums = new Map<string, string>();
      for (const j of todo) {
        patch(j.key, { status: "reading", progress: 0, message: undefined });
        sums.set(j.key, await sha256Hex(j.file));
      }
      const { existing } = await adminFetch<{ existing: { checksum: string; filename: string; status: string }[] }>("/api/admin/media/check", {
        method: "POST",
        body: JSON.stringify({ checksums: [...new Set(sums.values())] }),
      });
      const known = new Map(existing.filter((e) => e.status !== "failed").map((e) => [e.checksum, e.filename]));
      const seenInBatch = new Set<string>();
      const queue: Job[] = [];
      for (const j of todo) {
        const sum = sums.get(j.key)!;
        if (known.has(sum)) patch(j.key, { status: "duplicate", progress: 1, message: `Already uploaded as ${known.get(sum)}` });
        else if (seenInBatch.has(sum)) patch(j.key, { status: "duplicate", progress: 1, message: "Same file twice in this batch" });
        else {
          seenInBatch.add(sum);
          queue.push(j);
        }
      }
      // 2. upload with limited concurrency
      await Promise.all(
        Array.from({ length: CONCURRENCY }, async () => {
          for (let j = queue.shift(); j; j = queue.shift()) {
            try {
              await processJob(j, sums.get(j.key)!);
            } catch (e) {
              patch(j.key, { status: "failed", message: e instanceof Error ? e.message : "Upload failed" });
            }
          }
        }),
      );
    } catch (e) {
      setJobs((js) => js.map((j) => (j.status === "reading" ? { ...j, status: "failed", message: e instanceof Error ? e.message : "Failed" } : j)));
    } finally {
      setRunning(false);
      onDone();
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files.length) add(e.dataTransfer.files);
  };

  const counts = jobs.reduce<Record<string, number>>((m, j) => ((m[j.status] = (m[j.status] ?? 0) + 1), m), {});
  const totalBytes = jobs.reduce((n, j) => n + j.file.size, 0);
  const pendingCount = jobs.filter((j) => ["queued", "failed", "needs-date"].includes(j.status)).length;

  if (storage === "readonly") {
    return <p className="border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">Uploads need a connected storage backend (Vercel Blob). See README → Media.</p>;
  }

  return (
    <section aria-labelledby="up-title" className="border border-white/10 bg-ink-900/50 p-4 md:p-6">
      <h2 id="up-title" className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.24em] text-gold-300">
        <UploadCloud className="h-4 w-4" /> Upload photos & videos
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
          Event night (optional)
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="mt-1 h-10 w-full border border-white/15 bg-ink-950 px-2 text-sm normal-case tracking-normal text-white [color-scheme:dark]" />
        </label>
        <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
          Fallback date (no EXIF/folder)
          <input type="date" value={fallbackDate} onChange={(e) => setFallbackDate(e.target.value)} className="mt-1 h-10 w-full border border-white/15 bg-ink-950 px-2 text-sm normal-case tracking-normal text-white [color-scheme:dark]" />
        </label>
        <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
          Category
          <input list="media-cats" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Live Artists" className="mt-1 h-10 w-full border border-white/15 bg-ink-950 px-2 text-sm normal-case tracking-normal text-white placeholder:text-white/30" />
          <datalist id="media-cats">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
          Tags (comma separated)
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tipico, radio hotel" className="mt-1 h-10 w-full border border-white/15 bg-ink-950 px-2 text-sm normal-case tracking-normal text-white placeholder:text-white/30" />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-white/80">
          <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="h-4 w-4 accent-[#E0B94F]" />
          Publish right away
        </label>
      </div>
      <p className="mt-2 text-xs text-mute-2">Event night overrides photo dates for the whole batch. Leave it empty to group by each photo&apos;s capture date.</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cn("mt-4 flex flex-col items-center justify-center gap-3 border-2 border-dashed px-4 py-10 text-center transition-colors", drag ? "border-gold-300 bg-gold-400/5" : "border-white/15")}
      >
        <ImagePlus className="h-8 w-8 text-gold-300" aria-hidden />
        <p className="text-sm text-white/80">Drag photos & videos here</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => fileInput.current?.click()} className="h-10 border border-white/20 px-4 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white hover:border-gold-400">
            Choose files
          </button>
          <button type="button" onClick={() => folderInput.current?.click()} className="flex h-10 items-center gap-2 border border-white/20 px-4 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white hover:border-gold-400">
            <FolderUp className="h-4 w-4" /> Choose folder
          </button>
        </div>
        <p className="text-xs text-mute-2">JPEG, PNG, WebP, AVIF, GIF · MP4, MOV, WebM up to 200 MB. Big photos are resized in your browser before upload.</p>
        <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => e.target.files && add(e.target.files)} />
        {/* @ts-expect-error webkitdirectory is non-standard but supported by every major browser */}
        <input ref={folderInput} type="file" multiple webkitdirectory="" className="hidden" onChange={(e) => e.target.files && add(e.target.files)} />
      </div>

      {jobs.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-mute">
              {jobs.length} file(s) · {formatBytes(totalBytes)}
              {Object.entries(counts).map(([s, n]) => ` · ${n} ${s}`)}
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={running} onClick={() => setJobs((js) => js.filter((j) => !["done", "duplicate"].includes(j.status)))} className="h-10 px-3 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white disabled:opacity-40">
                Clear finished
              </button>
              <button type="button" disabled={running || !pendingCount} onClick={start} className="flex h-10 items-center gap-2 bg-gold-400 px-5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-950 hover:bg-gold-300 disabled:opacity-50">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {running ? "Uploading…" : `Upload ${pendingCount}`}
              </button>
            </div>
          </div>
          <ul className="mt-3 max-h-80 divide-y divide-white/5 overflow-y-auto border border-white/10">
            {jobs.map((j) => (
              <li key={j.key} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-5 shrink-0">
                  {j.status === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : j.status === "duplicate" ? <Copy className="h-4 w-4 text-sky-300" /> : j.status === "failed" || j.status === "needs-date" ? <AlertCircle className="h-4 w-4 text-red-300" /> : ["reading", "uploading"].includes(j.status) ? <Loader2 className="h-4 w-4 animate-spin text-gold-300" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-white">{j.path}</span>
                  <span className="block truncate text-xs text-mute">
                    {formatBytes(j.file.size)} · {j.status}
                    {j.date ? ` · ${j.date} (${j.dateSource})` : ""}
                    {j.message ? ` — ${j.message}` : ""}
                  </span>
                  {j.status === "uploading" && (
                    <span className="mt-1 block h-1 bg-white/10" aria-hidden>
                      <span className="block h-full bg-gold-400 transition-[width]" style={{ width: `${Math.round(j.progress * 100)}%` }} />
                    </span>
                  )}
                </span>
                {!running && j.status !== "done" && (
                  <button type="button" aria-label={`Remove ${j.path}`} onClick={() => setJobs((js) => js.filter((x) => x.key !== j.key))} className="text-white/40 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
