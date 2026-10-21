// @ts-check
/**
 * Media pipeline shared by the admin upload API (Next.js server) and the
 * import CLI (scripts/media-import.mjs). Plain ESM so both can load it.
 *
 *   sniff()        → real file type from magic bytes (never trusts the extension)
 *   readCapture()  → EXIF capture date, kept exactly as the camera recorded it
 *   imageVariants()→ WebP thumb / display / large renditions (EXIF + GPS stripped)
 *   createStorage()→ Vercel Blob (production) or a local folder (dev / tests)
 *   createAsset()  → status-tracked, transactional DB write with cleanup on failure
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/** Web renditions. Widths are maxima; images are never enlarged. */
export const IMAGE_VARIANTS = /** @type {const} */ ({
  thumb: { width: 480, quality: 70 },
  display: { width: 1280, quality: 78 },
  large: { width: 2048, quality: 78 },
});

export const LIMITS = {
  /** Original file size accepted by the import CLI. */
  importMaxBytes: 2 * 1024 * 1024 * 1024,
  /** Downscaled image the browser sends to the upload API (Vercel body limit is ~4.5 MB). */
  uploadMaxBytes: 4 * 1024 * 1024,
  /** Videos uploaded straight to Blob from the admin. */
  videoMaxBytes: 200 * 1024 * 1024,
  maxPixels: 120_000_000,
};

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const VIDEO_MIME = new Set(["video/mp4", "video/quicktime", "video/webm"]);

/**
 * Identify a file from its first bytes.
 * @param {Uint8Array} b
 * @returns {{ mime: string, mediaType: "image" | "video" } | { mime: null, reason: string }}
 */
export function sniff(b) {
  const hex = (/** @type {number} */ start, /** @type {number} */ len) => Buffer.from(b.subarray(start, start + len)).toString("hex");
  const ascii = (/** @type {number} */ start, /** @type {number} */ len) => Buffer.from(b.subarray(start, start + len)).toString("latin1");
  if (b.length < 12) return { mime: null, reason: "File is too small to be an image or video." };
  if (hex(0, 3) === "ffd8ff") return { mime: "image/jpeg", mediaType: "image" };
  if (hex(0, 8) === "89504e470d0a1a0a") return { mime: "image/png", mediaType: "image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { mime: "image/webp", mediaType: "image" };
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return { mime: "image/gif", mediaType: "image" };
  if (hex(0, 4) === "1a45dfa3") return { mime: "video/webm", mediaType: "video" };
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand === "avif" || brand === "avis") return { mime: "image/avif", mediaType: "image" };
    if (["heic", "heix", "mif1", "msf1", "hevc"].includes(brand))
      return { mime: null, reason: "HEIC photos are not supported — export as JPEG first (iPhone: Settings → Camera → Formats → Most Compatible)." };
    if (brand === "qt  ") return { mime: "video/quicktime", mediaType: "video" };
    return { mime: "video/mp4", mediaType: "video" };
  }
  return { mime: null, reason: "Unsupported or corrupt file (not a JPEG, PNG, WebP, AVIF, GIF, MP4, MOV or WebM)." };
}

/** @param {string} mime */
export const isAllowedMime = (mime) => IMAGE_MIME.has(mime) || VIDEO_MIME.has(mime);

/** @param {Uint8Array} buf */
export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/** Safe display version of an uploaded filename (no paths, no control chars). @param {unknown} name */
export function safeFilename(name) {
  const base = String(name ?? "").split(/[\\/]/).pop() ?? "";
  const clean = base.normalize("NFC").replace(/[\u0000-\u001f\u007f<>:"|?*]+/g, "").trim().slice(-255);
  return clean || "untitled";
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Validates a YYYY-MM-DD calendar date. @param {unknown} s @returns {s is string} */
export function isCalendarDate(s) {
  const m = DATE_RE.exec(String(s ?? ""));
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] && +m[1] >= 1990 && +m[1] <= 2100;
}

/**
 * Capture date from EXIF, exactly as recorded. The calendar date comes from
 * the camera's local wall-clock string, so no timezone guessing is involved.
 * Returns nulls when there is no trustworthy date (never invents one).
 * @param {Uint8Array} buf
 */
export async function readCapture(buf) {
  const exifr = (await import("exifr")).default;
  let tags;
  try {
    tags = await exifr.parse(Buffer.from(buf), { pick: ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal", "OffsetTime"], reviveValues: false });
  } catch {
    return { capturedAt: null, localDate: null };
  }
  const raw = tags?.DateTimeOriginal ?? tags?.CreateDate;
  const m = typeof raw === "string" ? /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(raw) : null;
  if (!m) return { capturedAt: null, localDate: null };
  const localDate = `${m[1]}-${m[2]}-${m[3]}`;
  if (!isCalendarDate(localDate) || m[1] === "0000") return { capturedAt: null, localDate: null };
  const offset = tags?.OffsetTimeOriginal ?? tags?.OffsetTime;
  // Without an offset the instant is unknown; keep the calendar date only.
  const capturedAt = typeof offset === "string" && /^[+-]\d{2}:\d{2}$/.test(offset) ? new Date(`${localDate}T${m[4]}:${m[5]}:${m[6]}${offset}`).toISOString() : null;
  return { capturedAt, localDate };
}

/**
 * Decode, auto-orient and render WebP variants. Throws on corrupt input.
 * @param {Uint8Array} buf
 */
export async function imageVariants(buf) {
  const sharp = (await import("sharp")).default;
  const base = sharp(Buffer.from(buf), { limitInputPixels: LIMITS.maxPixels, failOn: "error" }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("Could not read image dimensions.");
  const swap = (meta.orientation ?? 1) >= 5; // 90°/270° EXIF orientations
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;

  const out = [];
  for (const [kind, spec] of Object.entries(IMAGE_VARIANTS)) {
    const { data, info } = await base
      .clone()
      .resize({ width: spec.width, withoutEnlargement: true })
      .webp({ quality: spec.quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    out.push({ kind, buffer: data, width: info.width, height: info.height, mime: "image/webp" });
  }
  return { width, height, variants: out };
}

/**
 * @typedef {{ backend: "vercel-blob" | "local", put(key: string, body: Uint8Array, mime: string): Promise<{ storageKey: string, cdnUrl: string | null }>, remove(keys: string[]): Promise<void>, removePrefix(prefix: string): Promise<void> }} Storage
 */

/** @type {"public" | "private" | null} */
let detectedAccess = null;
/**
 * Access mode for new Blob objects: MEDIA_BLOB_ACCESS, else what a previous
 * write discovered, else "private" (works with private stores; files are
 * served through /api/media with CDN caching).
 * @returns {"public" | "private"}
 */
export function blobAccess() {
  const env = process.env.MEDIA_BLOB_ACCESS;
  if (env === "public" || env === "private") return env;
  return detectedAccess ?? "private";
}

/**
 * put() with the store's access mode. A Blob store only accepts the mode it
 * was created with; on a mismatch this switches once and remembers.
 * Used for media renditions and for the events data / admin uploads.
 * @param {string} key
 * @param {string | Uint8Array} body
 * @param {Omit<import("@vercel/blob").PutCommandOptions, "access">} opts
 */
export async function blobPut(key, body, opts) {
  const { put } = await import("@vercel/blob");
  const data = typeof body === "string" ? body : Buffer.from(body);
  let access = blobAccess();
  try {
    return { ...(await put(key, data, { ...opts, access })), access };
  } catch (err) {
    if (!/(private|public) (access|store)/i.test(String(/** @type {any} */ (err)?.message))) throw err;
    access = access === "private" ? "public" : "private";
    detectedAccess = access;
    return { ...(await put(key, data, { ...opts, access })), access };
  }
}

/**
 * @param {{ backend?: "vercel-blob" | "local", token?: string, localDir?: string }} [opts]
 * @returns {Storage}
 */
export function createStorage(opts = {}) {
  const backend = opts.backend ?? (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? "vercel-blob" : "local");
  if (backend === "vercel-blob") {
    const auth = opts.token ?? process.env.BLOB_READ_WRITE_TOKEN ? { token: opts.token ?? process.env.BLOB_READ_WRITE_TOKEN } : {};
    return {
      backend,
      async put(key, body, mime) {
        // Random suffix → unguessable, immutable objects that can be cached forever.
        const res = await blobPut(key, body, { contentType: mime, addRandomSuffix: true, cacheControlMaxAge: 31536000, ...auth });
        // Private objects have no public URL: they are streamed by /api/media (cdn_url NULL).
        return { storageKey: res.pathname, cdnUrl: res.access === "public" ? res.url : null };
      },
      async remove(keys) {
        if (!keys.length) return;
        const { del } = await import("@vercel/blob");
        await del(keys, auth);
      },
      async removePrefix(prefix) {
        const { del, list } = await import("@vercel/blob");
        /** @type {string | undefined} */
        let cursor;
        do {
          /** @type {import("@vercel/blob").ListBlobResult} */
          const page = await list({ prefix, cursor, limit: 1000, ...auth });
          if (page.blobs.length) await del(page.blobs.map((b) => b.url), auth);
          cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor);
      },
    };
  }
  const dir = opts.localDir ?? process.env.MEDIA_LOCAL_DIR ?? path.join(process.cwd(), ".data", "media");
  return {
    backend: "local",
    async put(key, body) {
      const storageKey = `${key.replace(/\.(\w+)$/, "")}-${crypto.randomBytes(6).toString("hex")}${path.extname(key)}`;
      const file = path.join(dir, storageKey);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, body);
      return { storageKey, cdnUrl: null };
    },
    async remove(keys) {
      await Promise.all(keys.map((k) => fs.rm(localPath(k, dir), { force: true })));
    },
    async removePrefix(prefix) {
      await fs.rm(localPath(prefix.replace(/\/+$/, ""), dir), { recursive: true, force: true });
    },
  };
}

/** Path on disk of a local-backend object, guarded against traversal. @param {string} storageKey @param {string} [localDir] */
export function localPath(storageKey, localDir = process.env.MEDIA_LOCAL_DIR ?? path.join(process.cwd(), ".data", "media")) {
  const root = path.resolve(localDir);
  const p = path.resolve(root, storageKey);
  if (!p.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return p;
}

/** @param {unknown} s */
export const slugifyTag = (s) =>
  String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/**
 * Create an asset end to end with status tracking:
 *   1. INSERT as "processing" (visible in the admin while it uploads)
 *   2. upload every variant
 *   3. one transaction: variants + tags + status "ready" (+ publish)
 * Any failure deletes uploaded objects and marks the row "failed".
 * Duplicates (same SHA-256) are detected before any upload. A "processing"
 * row older than `staleAfterMs` (default 30 min; the CLI's --resume passes 0)
 * is treated as a crashed attempt and retried.
 *
 * @param {import("pg").Pool} db
 * @param {Storage} storage
 * @param {{
 *   originalFilename: string, mimeType: string, mediaType: "image" | "video", fileSizeBytes: number,
 *   checksum: string, width?: number | null, height?: number | null, durationSeconds?: number | null,
 *   capturedAt?: string | null, galleryDate: string, dateSource: "event" | "capture" | "directory" | "manual",
 *   title?: string | null, caption?: string | null, description?: string | null, category?: string | null,
 *   eventSlug?: string | null, displayOrder?: number, tags?: string[], publish?: boolean,
 *   sourceLocation?: string | null, originalStorageKey?: string | null,
 *   staleAfterMs?: number,
 *   variants: () => Promise<{ kind: string, buffer?: Uint8Array, width?: number | null, height?: number | null, mime: string,
 *                            existing?: { storageKey: string, cdnUrl: string | null, size: number } }[]>,
 * }} input
 * @returns {Promise<{ status: "imported", id: string } | { status: "duplicate", id: string }>}
 */
export async function createAsset(db, storage, input) {
  const dup = await db.query("SELECT id, status, gallery_date, uploaded_at FROM media_assets WHERE checksum_sha256 = $1", [input.checksum]);
  const prev = dup.rows[0];
  if (prev) {
    // A previous attempt of OUR pipeline that failed, or crashed mid-upload
    // (> 30 min in "processing"), is cleaned up and retried. Anything else is a real duplicate.
    const staleAfter = input.staleAfterMs ?? 30 * 60 * 1000;
    const stale = prev.status === "failed" || (prev.status === "processing" && Date.now() - new Date(prev.uploaded_at).getTime() >= staleAfter);
    if (!stale) return { status: "duplicate", id: prev.id };
    const gd = typeof prev.gallery_date === "string" ? prev.gallery_date : new Date(prev.gallery_date).toISOString().slice(0, 10);
    await storage.removePrefix(`media/${gd.slice(0, 4)}/${gd.slice(5, 7)}/${prev.id}/`).catch(() => {});
    await db.query("DELETE FROM media_assets WHERE id = $1 AND status IN ('failed', 'processing')", [prev.id]);
  }

  let id;
  try {
    const ins = await db.query(
      `INSERT INTO media_assets (original_filename, title, caption, description, mime_type, media_type, file_size_bytes,
         width, height, duration_seconds, checksum_sha256, captured_at, gallery_date, date_source, event_slug, category,
         display_order, status, storage_backend, original_storage_key, source_location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'processing',$18,$19,$20)
       RETURNING id`,
      [
        safeFilename(input.originalFilename), input.title ?? null, input.caption ?? null, input.description ?? null,
        input.mimeType, input.mediaType, input.fileSizeBytes, input.width ?? null, input.height ?? null,
        input.durationSeconds ?? null, input.checksum, input.capturedAt ?? null, input.galleryDate, input.dateSource,
        input.eventSlug ?? null, input.category ?? null, input.displayOrder ?? 0, storage.backend,
        input.originalStorageKey ?? null, input.sourceLocation ?? null,
      ],
    );
    id = ins.rows[0].id;
  } catch (err) {
    // Lost a race with an identical upload.
    if (err && /** @type {any} */ (err).code === "23505") {
      const again = await db.query("SELECT id FROM media_assets WHERE checksum_sha256 = $1", [input.checksum]);
      if (again.rows[0]) return { status: "duplicate", id: again.rows[0].id };
    }
    throw err;
  }

  /** @type {{ kind: string, mime: string, width: number | null, height: number | null, size: number, storageKey: string, cdnUrl: string | null }[]} */
  const stored = [];
  const ownedKeys = [];
  try {
    const d = input.galleryDate;
    for (const v of await input.variants()) {
      if (v.existing) {
        stored.push({ kind: v.kind, mime: v.mime, width: v.width ?? null, height: v.height ?? null, size: v.existing.size, storageKey: v.existing.storageKey, cdnUrl: v.existing.cdnUrl });
        continue;
      }
      if (!v.buffer) throw new Error(`Variant ${v.kind} has no data`);
      const ext = v.mime === "image/webp" ? "webp" : v.mime === "image/jpeg" ? "jpg" : v.mime === "video/mp4" ? "mp4" : "bin";
      const res = await storage.put(`media/${d.slice(0, 4)}/${d.slice(5, 7)}/${id}/${v.kind}.${ext}`, v.buffer, v.mime);
      ownedKeys.push(storage.backend === "vercel-blob" && res.cdnUrl ? res.cdnUrl : res.storageKey);
      stored.push({ kind: v.kind, mime: v.mime, width: v.width ?? null, height: v.height ?? null, size: v.buffer.byteLength, ...res });
    }
    if (!stored.some((v) => v.kind === "thumb")) throw new Error("No thumbnail was produced.");

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      for (const v of stored) {
        await client.query(
          `INSERT INTO media_variants (asset_id, kind, mime_type, width, height, file_size_bytes, storage_backend, storage_key, cdn_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, v.kind, v.mime, v.width, v.height, v.size, storage.backend, v.storageKey, v.cdnUrl],
        );
      }
      for (const name of new Set((input.tags ?? []).map((t) => String(t).trim()).filter(Boolean))) {
        const slug = slugifyTag(name);
        if (!slug) continue;
        const tag = await client.query(
          `INSERT INTO media_tags (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id`,
          [slug, name.slice(0, 40)],
        );
        await client.query("INSERT INTO media_asset_tags (asset_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, tag.rows[0].id]);
      }
      await client.query(
        `UPDATE media_assets SET status = 'ready', processing_error = NULL,
           visibility = CASE WHEN $2 THEN 'published' ELSE visibility END,
           published_at = CASE WHEN $2 THEN now() ELSE published_at END
         WHERE id = $1`,
        [id, Boolean(input.publish)],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
    return { status: "imported", id };
  } catch (err) {
    await storage.remove(ownedKeys).catch(() => {});
    await db
      .query("UPDATE media_assets SET status = 'failed', processing_error = $2 WHERE id = $1", [id, String(/** @type {any} */ (err)?.message ?? err).slice(0, 500)])
      .catch(() => {});
    throw err;
  }
}
