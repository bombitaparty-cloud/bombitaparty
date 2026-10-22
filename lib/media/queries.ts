import "server-only";
import { adminDb, readDb, transaction } from "@/lib/db";
import { isCalendarDate, slugifyTag } from "@/lib/media/pipeline.mjs";
import type {
  AdminMediaItem,
  GalleryFacets,
  GalleryFilters,
  GalleryItem,
  GalleryPage,
  MediaRendition,
  MediaStats,
  MediaStatus,
  MediaType,
  MediaVisibility,
} from "./types";

/**
 * All media SQL. Public functions read only the "published + ready" views
 * (works with a read-only role); admin functions use the admin pool.
 * Every query is parameterized; variants and tags are folded in with
 * correlated JSON sub-selects, so a page is ONE query (no N+1).
 */

type VariantJson = Record<string, { url: string | null; backend: string; w: number | null; h: number | null }>;

/** Public URL for a variant: the immutable CDN URL, or the streaming endpoint for local storage. */
const rendition = (id: string, kind: string, v?: VariantJson[string]): MediaRendition | null =>
  v ? { url: v.url ?? `/api/media/${id}/${kind}`, w: v.w, h: v.h } : null;

function toGalleryItem(r: Record<string, unknown>): GalleryItem {
  const id = r.id as string;
  const v = (r.variants ?? {}) as VariantJson;
  const thumb = rendition(id, "thumb", v.thumb) ?? { url: `/api/media/${id}/thumb`, w: null, h: null };
  return {
    id,
    type: r.media_type as MediaType,
    title: (r.title as string) ?? null,
    caption: (r.caption as string) ?? null,
    date: r.gallery_date as string,
    width: (r.width as number) ?? null,
    height: (r.height as number) ?? null,
    duration: r.duration_seconds == null ? null : Number(r.duration_seconds),
    category: (r.category as string) ?? null,
    event: (r.event_slug as string) ?? null,
    tags: ((r.tags as { slug: string }[] | null) ?? []).map((t) => t.slug),
    thumb,
    display: rendition(id, "display", v.display),
    large: rendition(id, "large", v.large),
    poster: rendition(id, "poster", v.poster),
    video: rendition(id, "video", v.video),
  };
}

/* ── Cursor: base64url("YYYY-MM-DD|order|uuid") ─────────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

export function encodeCursor(i: { date: string; order: number; id: string }) {
  return Buffer.from(`${i.date}|${i.order}|${i.id}`).toString("base64url");
}
export function decodeCursor(c: string): { date: string; order: number; id: string } | null {
  try {
    const [date, order, id] = Buffer.from(c, "base64url").toString("utf8").split("|");
    if (!isCalendarDate(date) || !/^-?\d+$/.test(order) || !isUuid(id)) return null;
    return { date, order: Number(order), id };
  } catch {
    return null;
  }
}

/** WHERE fragments + params for public filters (values always bound as parameters). */
function publicWhere(f: GalleryFilters, params: unknown[], alias = "a") {
  const w: string[] = [];
  const p = (v: unknown) => `$${params.push(v)}`;
  if (f.date) w.push(`${alias}.gallery_date = ${p(f.date)}`);
  if (f.from) w.push(`${alias}.gallery_date >= ${p(f.from)}`);
  if (f.to) w.push(`${alias}.gallery_date <= ${p(f.to)}`);
  if (f.type) w.push(`${alias}.media_type = ${p(f.type)}`);
  if (f.category) w.push(`${alias}.category = ${p(f.category)}`);
  if (f.tag) w.push(`EXISTS (SELECT 1 FROM media_public_asset_tags t WHERE t.asset_id = ${alias}.id AND t.slug = ${p(f.tag)})`);
  return w;
}

const PUBLIC_COLUMNS = `
  a.id, a.media_type, a.title, a.caption, a.gallery_date, a.width, a.height, a.duration_seconds,
  a.category, a.event_slug, a.display_order,
  (SELECT json_object_agg(v.kind, json_build_object('url', v.cdn_url, 'backend', v.storage_backend, 'w', v.width, 'h', v.height))
     FROM media_public_variants v WHERE v.asset_id = a.id) AS variants,
  (SELECT json_agg(json_build_object('slug', t.slug) ORDER BY t.slug) FROM media_public_asset_tags t WHERE t.asset_id = a.id) AS tags`;

export async function listPublished(filters: GalleryFilters, opts: { cursor?: string | null; limit: number }): Promise<GalleryPage> {
  const params: unknown[] = [];
  const where = publicWhere(filters, params);
  if (opts.cursor) {
    const c = decodeCursor(opts.cursor);
    if (!c) throw new RangeError("Invalid cursor");
    const d = `$${params.push(c.date)}`;
    const o = `$${params.push(c.order)}`;
    const i = `$${params.push(c.id)}`;
    where.push(`(a.gallery_date < ${d} OR (a.gallery_date = ${d} AND (a.display_order, a.id) > (${o}, ${i}::uuid)))`);
  }
  const limit = Math.min(Math.max(opts.limit, 1), 60);
  const sql = `SELECT ${PUBLIC_COLUMNS} FROM media_public_assets a
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY a.gallery_date DESC, a.display_order, a.id
     LIMIT ${limit + 1}`;
  const { rows } = await readDb().query(sql, params);
  const more = rows.length > limit;
  const items = rows.slice(0, limit).map(toGalleryItem);
  const last = items.at(-1);
  const lastRow = rows[limit - 1];
  return {
    items,
    nextCursor: more && last ? encodeCursor({ date: last.date, order: Number(lastRow.display_order), id: last.id }) : null,
  };
}

export async function getPublished(id: string): Promise<GalleryItem | null> {
  if (!isUuid(id)) return null;
  const { rows } = await readDb().query(`SELECT ${PUBLIC_COLUMNS} FROM media_public_assets a WHERE a.id = $1`, [id]);
  return rows[0] ? toGalleryItem(rows[0]) : null;
}

/** Date headings with counts (newest first), plus category / tag facets for the filters. */
export async function galleryFacets(filters: Pick<GalleryFilters, "type" | "category" | "tag"> = {}): Promise<GalleryFacets> {
  const params: unknown[] = [];
  const where = publicWhere(filters, params);
  const W = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const db = readDb();
  const [dates, cats, tags] = await Promise.all([
    db.query(
      `SELECT a.gallery_date AS date, count(*)::int AS count,
              count(*) FILTER (WHERE a.media_type = 'image')::int AS images,
              count(*) FILTER (WHERE a.media_type = 'video')::int AS videos,
              coalesce(al.category, mode() WITHIN GROUP (ORDER BY a.category)) AS category,
              max(a.event_slug) AS event,
              al.title AS "albumTitle", al.venue, al.city,
              coalesce(
                (SELECT coalesce(v.cdn_url, '/api/media/' || v.asset_id || '/thumb') FROM media_public_variants v
                  WHERE v.asset_id = al.cover_asset_id AND v.kind = 'thumb'),
                (SELECT coalesce(v.cdn_url, '/api/media/' || c.id || '/thumb') FROM media_public_assets c JOIN media_public_variants v ON v.asset_id = c.id AND v.kind = 'thumb'
                  WHERE c.gallery_date = a.gallery_date ORDER BY c.display_order, c.id LIMIT 1)
              ) AS cover
         FROM media_public_assets a
         LEFT JOIN media_public_albums al ON al.album_date = a.gallery_date
         ${W}
        GROUP BY a.gallery_date, al.title, al.venue, al.city, al.category, al.cover_asset_id
        ORDER BY a.gallery_date DESC`,
      params,
    ),
    db.query(`SELECT category AS name, count(*)::int AS count FROM media_public_assets WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC, category`),
    db.query(`SELECT slug, min(name) AS name, count(*)::int AS count FROM media_public_asset_tags GROUP BY slug ORDER BY count DESC, slug LIMIT 50`),
  ]);
  // Albums the admin created that have no published photos yet show as "coming soon"
  // (only on the unfiltered view — a type/category/tag filter is about actual photos).
  const pending =
    where.length === 0
      ? (
          await db.query(
            `SELECT al.album_date AS date, 0 AS count, 0 AS images, 0 AS videos, al.category, NULL AS event,
                    al.title AS "albumTitle", al.venue, al.city, NULL AS cover
               FROM media_public_albums al
              WHERE NOT EXISTS (SELECT 1 FROM media_public_assets a WHERE a.gallery_date = al.album_date)`,
          )
        ).rows
      : [];
  const all = [...dates.rows, ...pending].sort((x, y) => String(y.date).localeCompare(String(x.date)));
  return {
    dates: all as GalleryFacets["dates"],
    categories: cats.rows as GalleryFacets["categories"],
    tags: tags.rows as GalleryFacets["tags"],
    total: dates.rows.reduce((n, r) => n + (r.count as number), 0),
  };
}

/** Storage reference for the delivery endpoint. Drafts only when `includeDrafts` (admin). */
export async function variantForDelivery(id: string, kind: string, includeDrafts: boolean) {
  if (!isUuid(id)) return null;
  const sql = includeDrafts
    ? `SELECT v.storage_backend, v.storage_key, v.cdn_url, v.mime_type, v.file_size_bytes, a.visibility, v.created_at
         FROM media_variants v JOIN media_assets a ON a.id = v.asset_id WHERE v.asset_id = $1 AND v.kind = $2`
    : `SELECT v.storage_backend, v.storage_key, v.cdn_url, v.mime_type, v.file_size_bytes, 'published' AS visibility, NULL::timestamptz AS created_at
         FROM media_public_variants v WHERE v.asset_id = $1 AND v.kind = $2`;
  const { rows } = await (includeDrafts ? adminDb() : readDb()).query(sql, [id, kind]);
  return (rows[0] as
    | { storage_backend: "vercel-blob" | "local"; storage_key: string; cdn_url: string | null; mime_type: string; file_size_bytes: number; visibility: MediaVisibility }
    | undefined) ?? null;
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

export interface AdminQuery {
  q?: string;
  status?: MediaStatus;
  visibility?: MediaVisibility;
  type?: MediaType;
  date?: string;
  category?: string;
  sort?: "date_desc" | "date_asc" | "uploaded_desc" | "name_asc";
  page?: number;
  pageSize?: number;
}

const SORTS: Record<NonNullable<AdminQuery["sort"]>, string> = {
  date_desc: "a.gallery_date DESC, a.display_order, a.id",
  date_asc: "a.gallery_date ASC, a.display_order, a.id",
  uploaded_desc: "a.uploaded_at DESC, a.id",
  name_asc: "a.original_filename ASC, a.id",
};

export async function adminList(q: AdminQuery): Promise<{ items: AdminMediaItem[]; total: number; page: number; pageSize: number }> {
  const params: unknown[] = [];
  const p = (v: unknown) => `$${params.push(v)}`;
  const w: string[] = [];
  if (q.q) {
    const like = p(`%${q.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
    w.push(`(a.original_filename ILIKE ${like} OR a.title ILIKE ${like} OR a.caption ILIKE ${like})`);
  }
  if (q.status) w.push(`a.status = ${p(q.status)}`);
  if (q.visibility) w.push(`a.visibility = ${p(q.visibility)}`);
  if (q.type) w.push(`a.media_type = ${p(q.type)}`);
  if (q.date) w.push(`a.gallery_date = ${p(q.date)}`);
  if (q.category) w.push(`a.category = ${p(q.category)}`);
  const W = w.length ? `WHERE ${w.join(" AND ")}` : "";
  const pageSize = Math.min(Math.max(q.pageSize ?? 48, 1), 200);
  const page = Math.max(q.page ?? 1, 1);
  const countParams = [...params];
  const limit = p(pageSize);
  const offset = p((page - 1) * pageSize);
  const db = adminDb();
  const [rows, count] = await Promise.all([
    db.query(
      `SELECT a.*,
         (SELECT json_object_agg(v.kind, json_build_object('url', v.cdn_url, 'backend', v.storage_backend, 'w', v.width, 'h', v.height)) FROM media_variants v WHERE v.asset_id = a.id) AS variants,
         (SELECT coalesce(sum(v.file_size_bytes), 0) FROM media_variants v WHERE v.asset_id = a.id) AS web_bytes,
         (SELECT json_agg(json_build_object('slug', t.slug, 'name', t.name) ORDER BY t.slug) FROM media_asset_tags at JOIN media_tags t ON t.id = at.tag_id WHERE at.asset_id = a.id) AS tag_list
       FROM media_assets a ${W} ORDER BY ${SORTS[q.sort ?? "date_desc"]} LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
    db.query(`SELECT count(*)::int AS n FROM media_assets a ${W}`, countParams),
  ]);
  const items = rows.rows.map((r) => {
    const base = toGalleryItem({ ...r, tags: [] });
    // Drafts are previewed through the admin-authorized delivery endpoint.
    const viaApi = (k: keyof GalleryItem) => {
      const v = base[k] as MediaRendition | null;
      return v ? { ...v, url: `/api/media/${base.id}/${k}` } : null;
    };
    return {
      ...base,
      thumb: viaApi("thumb") ?? base.thumb,
      display: viaApi("display"),
      large: viaApi("large"),
      poster: viaApi("poster"),
      video: viaApi("video"),
      tags: (r.tag_list as { slug: string; name: string }[] | null) ?? [],
      originalFilename: r.original_filename,
      description: r.description ?? null,
      mimeType: r.mime_type,
      fileSizeBytes: Number(r.file_size_bytes),
      checksum: String(r.checksum_sha256).trim(),
      capturedAt: r.captured_at ? new Date(r.captured_at).toISOString() : null,
      dateSource: r.date_source,
      displayOrder: r.display_order,
      status: r.status,
      visibility: r.visibility,
      error: r.processing_error ?? null,
      uploadedAt: new Date(r.uploaded_at).toISOString(),
      webBytes: Number(r.web_bytes),
    } satisfies AdminMediaItem;
  });
  return { items, total: count.rows[0].n, page, pageSize };
}

export interface MediaPatch {
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  category?: string | null;
  galleryDate?: string;
  eventSlug?: string | null;
  displayOrder?: number;
  visibility?: MediaVisibility;
  addTags?: string[];
  removeTags?: string[];
}

/** Applies one patch to many assets atomically. Returns ids that were updated. */
export async function adminUpdate(ids: string[], patch: MediaPatch): Promise<string[]> {
  return transaction(async (c) => {
    const sets: string[] = [];
    const params: unknown[] = [ids];
    const p = (v: unknown) => `$${params.push(v)}`;
    const text = (k: keyof MediaPatch, col: string) => {
      if (k in patch) sets.push(`${col} = ${p((patch[k] as string | null) || null)}`);
    };
    text("title", "title");
    text("caption", "caption");
    text("description", "description");
    text("category", "category");
    text("eventSlug", "event_slug");
    if (patch.galleryDate) {
      sets.push(`gallery_date = ${p(patch.galleryDate)}`, `date_source = 'manual'`);
      // A photo moved to another night can't stay the cover of its old album.
      await c.query("UPDATE media_albums SET cover_asset_id = NULL WHERE cover_asset_id = ANY($1::uuid[]) AND album_date <> $2", [ids, patch.galleryDate]);
    }
    if (patch.displayOrder !== undefined) sets.push(`display_order = ${p(patch.displayOrder)}`);
    if (patch.visibility === "published") sets.push(`visibility = 'published'`, `published_at = coalesce(published_at, now())`);
    if (patch.visibility === "draft") sets.push(`visibility = 'draft'`);

    let updated: string[] = ids;
    if (sets.length) {
      // Only ready assets can be published; others are left unchanged and reported back.
      const guard = patch.visibility === "published" ? " AND status = 'ready'" : "";
      const r = await c.query(`UPDATE media_assets SET ${sets.join(", ")} WHERE id = ANY($1::uuid[])${guard} RETURNING id`, params);
      updated = r.rows.map((x) => x.id);
    }
    for (const name of patch.addTags ?? []) {
      const slug = slugifyTag(name);
      if (!slug) continue;
      const tag = await c.query(
        "INSERT INTO media_tags (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id",
        [slug, name.trim().slice(0, 40)],
      );
      await c.query(
        "INSERT INTO media_asset_tags (asset_id, tag_id) SELECT unnest($1::uuid[]), $2 ON CONFLICT DO NOTHING",
        [updated, tag.rows[0].id],
      );
    }
    if (patch.removeTags?.length) {
      await c.query(
        "DELETE FROM media_asset_tags WHERE asset_id = ANY($1::uuid[]) AND tag_id IN (SELECT id FROM media_tags WHERE slug = ANY($2))",
        [updated, patch.removeTags.map(slugifyTag)],
      );
    }
    return updated;
  });
}

/**
 * Deletes rows first (so nothing public can reference a missing file), then
 * returns the storage references for the caller to remove from storage.
 */
export async function adminDelete(ids: string[]) {
  return transaction(async (c) => {
    const v = await c.query(
      "SELECT v.storage_backend, v.storage_key, v.cdn_url FROM media_variants v WHERE v.asset_id = ANY($1::uuid[])",
      [ids],
    );
    const d = await c.query("DELETE FROM media_assets WHERE id = ANY($1::uuid[]) RETURNING id", [ids]);
    return {
      deleted: d.rows.map((r) => r.id as string),
      objects: v.rows as { storage_backend: "vercel-blob" | "local"; storage_key: string; cdn_url: string | null }[],
    };
  });
}

export async function findByChecksums(sums: string[]) {
  const { rows } = await adminDb().query(
    "SELECT checksum_sha256, id, original_filename, status FROM media_assets WHERE checksum_sha256 = ANY($1)",
    [sums],
  );
  return rows.map((r) => ({ checksum: String(r.checksum_sha256).trim(), id: r.id as string, filename: r.original_filename as string, status: r.status as MediaStatus }));
}

export async function mediaStats(): Promise<MediaStats> {
  const db = adminDb();
  const [a, v] = await Promise.all([
    db.query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status = 'pending')::int AS pending,
        count(*) FILTER (WHERE status = 'processing')::int AS processing,
        count(*) FILTER (WHERE status = 'ready')::int AS ready,
        count(*) FILTER (WHERE status = 'failed')::int AS failed,
        count(*) FILTER (WHERE visibility = 'published')::int AS published,
        count(*) FILTER (WHERE visibility = 'draft')::int AS drafts,
        count(*) FILTER (WHERE media_type = 'image')::int AS images,
        count(*) FILTER (WHERE media_type = 'video')::int AS videos,
        count(DISTINCT gallery_date)::int AS dates,
        coalesce(sum(file_size_bytes), 0) AS original_bytes
      FROM media_assets`),
    db.query(`SELECT coalesce(sum(file_size_bytes), 0) AS web_bytes,
        coalesce(sum(file_size_bytes) FILTER (WHERE storage_backend = 'vercel-blob'), 0) AS blob_bytes
      FROM media_variants`),
  ]);
  const r = a.rows[0];
  return {
    total: r.total,
    byStatus: { pending: r.pending, processing: r.processing, ready: r.ready, failed: r.failed },
    published: r.published,
    drafts: r.drafts,
    images: r.images,
    videos: r.videos,
    dates: r.dates,
    originalBytes: Number(r.original_bytes),
    webBytes: Number(v.rows[0].web_bytes),
    blobBytes: Number(v.rows[0].blob_bytes),
    budgetBytes: Number(process.env.MEDIA_STORAGE_BUDGET_BYTES ?? 900 * 1024 * 1024),
  };
}

/* ── Albums (one per night) ─────────────────────────────────────────────── */

export interface AdminAlbum {
  date: string;
  title: string | null;
  venue: string | null;
  city: string;
  category: string | null;
  description: string | null;
  coverAssetId: string | null;
  /** Thumbnail shown in the admin: the chosen cover, else the night's first ready photo. */
  thumb: string | null;
  total: number;
  published: number;
  /** false when photos exist for the date but no album details were saved yet. */
  saved: boolean;
}

/** Every night that has photos or saved album details, newest first. */
export async function adminAlbums(): Promise<AdminAlbum[]> {
  const { rows } = await adminDb().query(`
    WITH d AS (
      SELECT gallery_date AS date, count(*)::int AS total,
             count(*) FILTER (WHERE visibility = 'published' AND status = 'ready')::int AS published,
             (array_agg(id ORDER BY display_order, id) FILTER (WHERE status = 'ready'))[1] AS first_id
        FROM media_assets GROUP BY gallery_date
    )
    SELECT coalesce(al.album_date, d.date) AS date, al.title, al.venue, coalesce(al.city, 'New York') AS city,
           al.category, al.description, al.cover_asset_id, coalesce(al.cover_asset_id, d.first_id) AS thumb_id,
           coalesce(d.total, 0) AS total, coalesce(d.published, 0) AS published, (al.album_date IS NOT NULL) AS saved
      FROM d FULL OUTER JOIN media_albums al ON al.album_date = d.date
     ORDER BY 1 DESC`);
  return rows.map((r) => ({
    date: r.date,
    title: r.title ?? null,
    venue: r.venue ?? null,
    city: r.city,
    category: r.category ?? null,
    description: r.description ?? null,
    coverAssetId: r.cover_asset_id ?? null,
    thumb: r.thumb_id ? `/api/media/${r.thumb_id}/thumb` : null,
    total: r.total,
    published: r.published,
    saved: r.saved,
  }));
}

export async function saveAlbum(a: { date: string; title: string; venue: string | null; city: string | null; category: string | null; description: string | null }) {
  await adminDb().query(
    `INSERT INTO media_albums (album_date, title, venue, city, category, description)
     VALUES ($1, $2, $3, coalesce($4, 'New York'), $5, $6)
     ON CONFLICT (album_date) DO UPDATE SET title = EXCLUDED.title, venue = EXCLUDED.venue, city = EXCLUDED.city,
       category = EXCLUDED.category, description = EXCLUDED.description`,
    [a.date, a.title, a.venue, a.city, a.category, a.description],
  );
}

/**
 * Makes a photo its night's album thumbnail. The photo must belong to that
 * night; an album row is created (titled "Bombita Party") if none exists yet.
 * Returns false when the photo doesn't exist or isn't ready.
 */
export async function setAlbumCover(assetId: string): Promise<{ date: string } | null> {
  const { rows } = await adminDb().query(
    `INSERT INTO media_albums (album_date, title, cover_asset_id)
       SELECT gallery_date, 'Bombita Party', id FROM media_assets WHERE id = $1 AND status = 'ready'
     ON CONFLICT (album_date) DO UPDATE SET cover_asset_id = EXCLUDED.cover_asset_id
     RETURNING album_date AS date`,
    [assetId],
  );
  return rows[0] ? { date: rows[0].date } : null;
}

/** Removes album details only — the night's photos are untouched. */
export async function deleteAlbum(date: string): Promise<boolean> {
  const r = await adminDb().query("DELETE FROM media_albums WHERE album_date = $1", [date]);
  return (r.rowCount ?? 0) > 0;
}
