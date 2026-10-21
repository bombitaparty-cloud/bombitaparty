import { NextResponse } from "next/server";
import { get, head } from "@vercel/blob";
import { ApiError, badRequest, oneOf, rateLimit, readJson, requireAdminApi, route, str } from "@/lib/api";
import { adminDb } from "@/lib/db";
import { log } from "@/lib/log";
import { blobAuth } from "@/lib/store/events";
import { adminDelete, adminList, adminUpdate, isUuid, type MediaPatch } from "@/lib/media/queries";
import { LIMITS, blobAccess, createAsset, createStorage, imageVariants, isAllowedMime, isCalendarDate, safeFilename, sniff } from "@/lib/media/pipeline.mjs";
import type { MediaStatus, MediaType, MediaVisibility } from "@/lib/media/types";

/**
 * Admin media API (session + x-bombita-admin header required, see lib/api).
 *   GET    ?q&status&visibility&type&date&category&sort&page&pageSize   → paginated list
 *   POST   multipart: file (downscaled image ≤ 4 MB, or a video poster) + meta (JSON)
 *   PATCH  { ids: uuid[], patch: MediaPatch }                          → bulk edit / publish
 *   DELETE { ids: uuid[] }                                             → delete rows + stored files
 */
const STATUSES = ["pending", "processing", "ready", "failed"] as const;
const VIS = ["draft", "published"] as const;
const TYPES = ["image", "video"] as const;
const SORTS = ["date_desc", "date_asc", "uploaded_desc", "name_asc"] as const;

export const GET = route("admin.media.list", async (req: Request) => {
  await requireAdminApi(req);
  const sp = new URL(req.url).searchParams;
  const date = sp.get("date") || undefined;
  if (date && !isCalendarDate(date)) throw badRequest("date must be YYYY-MM-DD.");
  const res = await adminList({
    q: sp.get("q")?.slice(0, 100) || undefined,
    status: oneOf(sp.get("status"), STATUSES, "status") as MediaStatus | undefined,
    visibility: oneOf(sp.get("visibility"), VIS, "visibility") as MediaVisibility | undefined,
    type: oneOf(sp.get("type"), TYPES, "type") as MediaType | undefined,
    date,
    category: sp.get("category")?.slice(0, 60) || undefined,
    sort: oneOf(sp.get("sort"), SORTS, "sort"),
    page: Number(sp.get("page") ?? 1) || 1,
    pageSize: Number(sp.get("pageSize") ?? 48) || 48,
  });
  return NextResponse.json(res, { headers: { "Cache-Control": "private, no-store" } });
});

interface UploadMeta {
  originalFilename: string;
  originalMime: string;
  originalSize: number;
  checksum: string;
  originalWidth?: number;
  originalHeight?: number;
  durationSeconds?: number;
  capturedAt?: string | null;
  galleryDate: string;
  dateSource: "event" | "capture" | "directory" | "manual";
  title?: string;
  caption?: string;
  category?: string;
  eventSlug?: string;
  tags?: string[];
  publish?: boolean;
  /** Videos: Blob URL of the file the browser uploaded directly. */
  videoUrl?: string;
}

function parseMeta(raw: unknown): UploadMeta {
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(String(raw ?? ""));
  } catch {
    throw badRequest("meta must be JSON.");
  }
  if (!m || typeof m !== "object") throw badRequest("meta must be an object.");
  if (typeof m.checksum !== "string" || !/^[0-9a-f]{64}$/.test(m.checksum)) throw badRequest("checksum must be a SHA-256 hex digest.");
  if (typeof m.originalMime !== "string" || !isAllowedMime(m.originalMime)) throw badRequest("Unsupported original file type.");
  const size = Number(m.originalSize);
  if (!Number.isFinite(size) || size <= 0 || size > LIMITS.importMaxBytes) throw badRequest("originalSize is invalid.");
  if (!isCalendarDate(m.galleryDate)) throw badRequest("galleryDate must be YYYY-MM-DD.");
  const dateSource = oneOf(m.dateSource, ["event", "capture", "directory", "manual"] as const, "dateSource") ?? "manual";
  const dim = (v: unknown) => (v === undefined || v === null ? undefined : Number.isInteger(v) && (v as number) > 0 && (v as number) < 100_000 ? (v as number) : (() => { throw badRequest("Invalid dimensions."); })());
  if (m.capturedAt != null && (typeof m.capturedAt !== "string" || isNaN(Date.parse(m.capturedAt)))) throw badRequest("capturedAt must be an ISO date.");
  const tags = Array.isArray(m.tags) ? m.tags.slice(0, 20).map((t) => str(t, 40, "tag")).filter((t): t is string => Boolean(t)) : [];
  return {
    originalFilename: safeFilename(m.originalFilename),
    originalMime: m.originalMime,
    originalSize: size,
    checksum: m.checksum,
    originalWidth: dim(m.originalWidth),
    originalHeight: dim(m.originalHeight),
    durationSeconds: m.durationSeconds == null ? undefined : Math.max(0, Number(m.durationSeconds) || 0),
    capturedAt: (m.capturedAt as string) ?? null,
    galleryDate: m.galleryDate as string,
    dateSource,
    title: str(m.title, 200, "title") ?? undefined,
    caption: str(m.caption, 500, "caption") ?? undefined,
    category: str(m.category, 60, "category") ?? undefined,
    eventSlug: str(m.eventSlug, 120, "eventSlug") ?? undefined,
    tags,
    publish: m.publish === true,
    videoUrl: typeof m.videoUrl === "string" ? m.videoUrl : undefined,
  };
}

/** Confirms a browser-uploaded video really is in our Blob store and really is a video. */
async function checkUploadedVideo(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw badRequest("videoUrl is invalid.");
  }
  if (u.protocol !== "https:" || !u.hostname.endsWith(".blob.vercel-storage.com") || !u.pathname.startsWith("/media/uploads/")) {
    throw badRequest("videoUrl must be a file uploaded through the admin.");
  }
  // head() only succeeds for objects in OUR store (it uses our credentials).
  const meta = await head(url, blobAuth).catch(() => null);
  if (!meta || !meta.pathname.startsWith("media/uploads/")) throw badRequest("The uploaded video was not found in storage.");
  if (meta.size > LIMITS.videoMaxBytes) throw badRequest(`Videos are limited to ${LIMITS.videoMaxBytes / 1024 / 1024} MB.`);
  const access = blobAccess();
  const first =
    access === "private"
      ? await get(meta.pathname, { access: "private", headers: { Range: "bytes=0-63" }, ...blobAuth })
      : null;
  const bytes = first?.statusCode === 200 ? await new Response(first.stream).arrayBuffer() : await (await fetch(url, { headers: { Range: "bytes=0-63" } })).arrayBuffer();
  const kind = sniff(new Uint8Array(bytes).subarray(0, 64));
  if (!kind.mime || kind.mediaType !== "video") throw badRequest("The uploaded file is not a supported video.");
  return { pathname: meta.pathname, url: access === "public" ? meta.url : null, size: meta.size, mime: kind.mime };
}

export const POST = route("admin.media.create", async (req: Request) => {
  await requireAdminApi(req);
  rateLimit(req, "admin-upload", 120);
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > LIMITS.uploadMaxBytes + 64 * 1024) throw new ApiError(413, "too_large", "Upload is larger than 4 MB — the browser should downscale images first.");

  const form = await req.formData().catch(() => {
    throw badRequest("Expected multipart form data.");
  });
  const meta = parseMeta(form.get("meta"));
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("file is required (the image, or the video's poster frame).");
  if (file.size > LIMITS.uploadMaxBytes) throw new ApiError(413, "too_large", "Image is larger than 4 MB.");
  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(buf);
  if ("reason" in kind) throw badRequest(kind.reason);
  if (kind.mediaType !== "image") throw badRequest("file must be an image.");

  const isVideo = meta.originalMime.startsWith("video/");
  const storage = createStorage();
  let video: Awaited<ReturnType<typeof checkUploadedVideo>> | { local: Uint8Array; mime: string } | null = null;
  if (isVideo) {
    if (meta.videoUrl) video = await checkUploadedVideo(meta.videoUrl);
    else if (storage.backend === "local" && form.get("video") instanceof File) {
      const vf = form.get("video") as File;
      const vb = new Uint8Array(await vf.arrayBuffer());
      const vk = sniff(vb);
      if (!vk.mime || vk.mediaType !== "video") throw badRequest("video is not a supported video file.");
      video = { local: vb, mime: vk.mime };
    } else throw badRequest("Videos must be uploaded to storage first (videoUrl).");
  }

  let processed: Awaited<ReturnType<typeof imageVariants>>;
  try {
    processed = await imageVariants(buf);
  } catch {
    throw badRequest("The image could not be decoded — the file may be corrupt.");
  }

  const result = await createAsset(adminDb(), storage, {
    originalFilename: meta.originalFilename,
    mimeType: meta.originalMime,
    mediaType: isVideo ? "video" : "image",
    fileSizeBytes: meta.originalSize,
    checksum: meta.checksum,
    width: meta.originalWidth ?? processed.width,
    height: meta.originalHeight ?? processed.height,
    durationSeconds: meta.durationSeconds ?? null,
    capturedAt: meta.capturedAt ?? null,
    galleryDate: meta.galleryDate,
    dateSource: meta.dateSource,
    title: meta.title,
    caption: meta.caption,
    category: meta.category,
    eventSlug: meta.eventSlug,
    tags: meta.tags,
    publish: meta.publish,
    sourceLocation: "admin-upload",
    variants: async () => {
      if (!isVideo) return processed.variants;
      const poster = processed.variants.filter((v) => v.kind !== "large").map((v) => ({ ...v, kind: v.kind === "display" ? "poster" : v.kind }));
      const v = video!;
      if ("local" in v) return [...poster, { kind: "video", buffer: v.local, mime: v.mime, width: meta.originalWidth ?? null, height: meta.originalHeight ?? null }];
      return [...poster, { kind: "video", mime: v.mime, width: meta.originalWidth ?? null, height: meta.originalHeight ?? null, existing: { storageKey: v.pathname, cdnUrl: v.url, size: v.size } }];
    },
  });
  log.info("admin.media.created", { id: result.id, status: result.status, type: isVideo ? "video" : "image" });
  return NextResponse.json(result, { status: result.status === "imported" ? 201 : 200 });
});

const MAX_IDS = 500;
function parseIds(v: unknown): string[] {
  if (!Array.isArray(v) || !v.length) throw badRequest("ids must be a non-empty array.");
  if (v.length > MAX_IDS) throw badRequest(`At most ${MAX_IDS} ids per request.`);
  if (!v.every(isUuid)) throw badRequest("ids must be UUIDs.");
  return [...new Set(v)];
}

export const PATCH = route("admin.media.update", async (req: Request) => {
  await requireAdminApi(req);
  const body = await readJson<{ ids?: unknown; patch?: Record<string, unknown> }>(req);
  const ids = parseIds(body.ids);
  const p = body.patch ?? {};
  const patch: MediaPatch = {};
  if ("title" in p) patch.title = str(p.title, 200, "title");
  if ("caption" in p) patch.caption = str(p.caption, 500, "caption");
  if ("description" in p) patch.description = str(p.description, 4000, "description");
  if ("category" in p) patch.category = str(p.category, 60, "category");
  if ("eventSlug" in p) patch.eventSlug = str(p.eventSlug, 120, "eventSlug");
  if ("galleryDate" in p) {
    if (!isCalendarDate(p.galleryDate)) throw badRequest("galleryDate must be YYYY-MM-DD.");
    patch.galleryDate = p.galleryDate as string;
  }
  if ("displayOrder" in p) {
    if (!Number.isInteger(p.displayOrder) || Math.abs(p.displayOrder as number) > 1_000_000) throw badRequest("displayOrder must be an integer.");
    patch.displayOrder = p.displayOrder as number;
  }
  if ("visibility" in p) patch.visibility = oneOf(p.visibility, VIS, "visibility");
  const tagList = (v: unknown) => (Array.isArray(v) ? v.slice(0, 20).map((t) => str(t, 40, "tag")).filter((t): t is string => Boolean(t)) : undefined);
  patch.addTags = tagList(p.addTags);
  patch.removeTags = tagList(p.removeTags);
  if (!Object.values(patch).some((v) => v !== undefined)) throw badRequest("Nothing to change.");

  const updated = await adminUpdate(ids, patch);
  const skipped = ids.filter((id) => !updated.includes(id));
  log.info("admin.media.updated", { count: updated.length, skipped: skipped.length, fields: Object.keys(patch).filter((k) => patch[k as keyof MediaPatch] !== undefined) });
  return NextResponse.json({ updated, skipped, ...(skipped.length && patch.visibility === "published" ? { note: "Only assets with status 'ready' can be published." } : {}) });
});

export const DELETE = route("admin.media.delete", async (req: Request) => {
  await requireAdminApi(req);
  const body = await readJson<{ ids?: unknown }>(req);
  const ids = parseIds(body.ids);
  const { deleted, objects } = await adminDelete(ids);
  // Rows are gone (nothing can reference the files any more); now remove the files.
  const failures: string[] = [];
  for (const backend of ["vercel-blob", "local"] as const) {
    const keys = objects.filter((o) => o.storage_backend === backend).map((o) => (backend === "vercel-blob" ? o.cdn_url ?? o.storage_key : o.storage_key));
    // Videos uploaded through the admin share the same Blob store and are removed with the asset.
    if (!keys.length) continue;
    try {
      await createStorage({ backend }).remove(keys);
    } catch (err) {
      failures.push(...keys);
      log.error("admin.media.orphaned_files", { backend, count: keys.length, error: err instanceof Error ? err.message : String(err) });
    }
  }
  log.info("admin.media.deleted", { count: deleted.length, files: objects.length, orphaned: failures.length });
  return NextResponse.json({ deleted, filesRemoved: objects.length - failures.length, orphanedFiles: failures.length });
});
