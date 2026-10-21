import { createReadStream, promises as fs } from "fs";
import { Readable } from "stream";
import { get } from "@vercel/blob";
import { ApiError, rateLimit, route } from "@/lib/api";
import { isAdmin } from "@/lib/admin/auth";
import { variantForDelivery } from "@/lib/media/queries";
import { localPath } from "@/lib/media/pipeline.mjs";
import { blobAuth } from "@/lib/store/events";

/**
 * GET|HEAD /api/media/:id/:kind — the stable delivery endpoint for every rendition
 * (thumb, display, large, poster, video).
 *
 *  - Public Blob objects → 302 to the immutable Blob CDN URL.
 *  - Private Blob objects → streamed from Blob (Range / 206 / 304 passed
 *    through, never buffered). Published files are sent with immutable cache
 *    headers, so Vercel's CDN serves repeat requests without calling this function.
 *  - Local storage (development) → streamed from disk with Range / 206 support.
 *  - Drafts are only delivered to a signed-in admin, never cached publicly.
 */
const KINDS = new Set(["thumb", "display", "large", "poster", "video"]);

async function deliver(req: Request, ctx: RouteContext<"/api/media/[id]/[kind]">, headOnly: boolean) {
  rateLimit(req, "media", 600);
  const { id, kind } = await ctx.params;
  if (!KINDS.has(kind)) throw new ApiError(404, "not_found", "Unknown rendition.");
  const admin = await isAdmin();
  const v = await variantForDelivery(id, kind, admin);
  if (!v) throw new ApiError(404, "not_found", "Not found.");
  const published = v.visibility === "published";
  const cache = published ? "public, max-age=31536000, immutable" : "private, no-store";

  if (v.storage_backend === "vercel-blob" && v.cdn_url) {
    return new Response(null, { status: 302, headers: { Location: v.cdn_url, "Cache-Control": published ? "public, max-age=3600" : "private, no-store" } });
  }

  if (v.storage_backend === "vercel-blob") {
    const range = req.headers.get("range");
    const res = await get(v.storage_key, {
      access: "private",
      ifNoneMatch: req.headers.get("if-none-match") ?? undefined,
      headers: range ? { Range: range } : undefined,
      ...blobAuth,
    });
    if (!res) throw new ApiError(404, "not_found", "File is missing from storage.");
    const headers: Record<string, string> = { "Content-Type": v.mime_type, "Accept-Ranges": "bytes", "Cache-Control": cache, "X-Content-Type-Options": "nosniff" };
    if (published) headers["Vercel-CDN-Cache-Control"] = "public, max-age=31536000, immutable";
    for (const h of ["etag", "content-length", "content-range", "last-modified"]) {
      const val = res.headers?.get(h);
      if (val) headers[h] = val;
    }
    if (res.statusCode === 304) return new Response(null, { status: 304, headers });
    const status = res.headers.get("content-range") ? 206 : 200;
    return new Response(headOnly ? null : res.stream, { status, headers });
  }

  const file = localPath(v.storage_key);
  const stat = await fs.stat(file).catch(() => null);
  if (!stat) throw new ApiError(404, "not_found", "File is missing from storage.");
  const etag = `"${Buffer.from(v.storage_key).toString("base64url").slice(-40)}-${stat.size}"`;
  const base: Record<string, string> = { "Content-Type": v.mime_type, "Accept-Ranges": "bytes", "Cache-Control": cache, ETag: etag, "X-Content-Type-Options": "nosniff" };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: base });

  const range = req.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    let start = m && m[1] ? Number(m[1]) : NaN;
    let end = m && m[2] ? Number(m[2]) : stat.size - 1;
    if (m && !m[1] && m[2]) {
      start = Math.max(stat.size - Number(m[2]), 0); // suffix range: last N bytes
      end = stat.size - 1;
    }
    if (!m || isNaN(start) || start > end || start >= stat.size) {
      return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${stat.size}` } });
    }
    end = Math.min(end, stat.size - 1);
    const headers = { ...base, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) };
    if (headOnly) return new Response(null, { status: 206, headers });
    const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(body, { status: 206, headers });
  }
  const headers = { ...base, "Content-Length": String(stat.size) };
  if (headOnly) return new Response(null, { status: 200, headers });
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { status: 200, headers });
}

export const GET = route("media.deliver", (req: Request, ctx: RouteContext<"/api/media/[id]/[kind]">) => deliver(req, ctx, false));
export const HEAD = route("media.deliver", (req: Request, ctx: RouteContext<"/api/media/[id]/[kind]">) => deliver(req, ctx, true));
