import "server-only";
import { createHash } from "crypto";
import { badRequest, oneOf } from "@/lib/api";
import { isCalendarDate, slugifyTag } from "@/lib/media/pipeline.mjs";
import type { GalleryFilters } from "./types";

/** Parses + validates gallery filters from a query string. Unknown params are ignored. */
export function parseFilters(sp: URLSearchParams): GalleryFilters {
  const date = (k: string) => {
    const v = sp.get(k);
    if (!v) return undefined;
    if (!isCalendarDate(v)) throw badRequest(`${k} must be a date (YYYY-MM-DD).`);
    return v;
  };
  const f: GalleryFilters = {
    date: date("date"),
    from: date("from"),
    to: date("to"),
    type: oneOf(sp.get("type"), ["image", "video"] as const, "type"),
    category: sp.get("category")?.slice(0, 60) || undefined,
    tag: sp.get("tag") ? slugifyTag(sp.get("tag")!) || undefined : undefined,
  };
  if (f.from && f.to && f.from > f.to) throw badRequest("from must be on or before to.");
  return f;
}

/** JSON response with a strong ETag and 304 support for conditional requests. */
export function cachedJson(req: Request, body: unknown, cache: { browser: string; cdn?: string }) {
  const json = JSON.stringify(body);
  const etag = `"${createHash("sha1").update(json).digest("base64url")}"`;
  const headers: Record<string, string> = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache.browser, ETag: etag, Vary: "Accept-Encoding" };
  if (cache.cdn) headers["Vercel-CDN-Cache-Control"] = cache.cdn;
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(json, { status: 200, headers });
}

/**
 * Public listing cache. Browsers always revalidate (cheap: ETag → 304), so an
 * unpublished or deleted photo disappears on the next load. Only Vercel's CDN
 * keeps a copy (60 s fresh, then stale-while-revalidate for 10 min).
 */
export const PUBLIC_CACHE = { browser: "public, max-age=0, must-revalidate", cdn: "max-age=60, stale-while-revalidate=600" };
