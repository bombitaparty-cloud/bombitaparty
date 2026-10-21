import { get } from "@vercel/blob";
import { ApiError, rateLimit, route } from "@/lib/api";
import { blobAuth } from "@/lib/store/events";

/**
 * GET|HEAD /api/files/events/<pathname> — serves event flyers, photos and
 * videos uploaded from the admin when the Blob store is private.
 *
 * Only the events/ folder is reachable: signups, reservations and media
 * live under other prefixes and can never be read through this route.
 * Upload pathnames carry a random suffix, so files are immutable and the
 * CDN caches them for a year. Range requests are passed through for video.
 */
const ALLOWED = /^events\/[a-z0-9][a-z0-9._-]{0,200}$/i;
const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

async function serve(req: Request, ctx: RouteContext<"/api/files/[...path]">, headOnly: boolean) {
  rateLimit(req, "files", 600);
  const pathname = (await ctx.params).path.join("/");
  if (!ALLOWED.test(pathname) || pathname.includes("..")) throw new ApiError(404, "not_found", "Not found.");
  const range = req.headers.get("range");
  const res = await get(pathname, {
    access: "private",
    ifNoneMatch: req.headers.get("if-none-match") ?? undefined,
    headers: range ? { Range: range } : undefined,
    ...blobAuth,
  }).catch(() => null);
  if (!res) throw new ApiError(404, "not_found", "Not found.");

  const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
  const headers: Record<string, string> = {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Vercel-CDN-Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };
  for (const h of ["etag", "content-length", "content-range", "last-modified"]) {
    const v = res.headers?.get(h);
    if (v) headers[h] = v;
  }
  if (res.statusCode === 304) return new Response(null, { status: 304, headers });
  return new Response(headOnly ? null : res.stream, { status: res.headers.get("content-range") ? 206 : 200, headers });
}

export const GET = route("files.serve", (req: Request, ctx: RouteContext<"/api/files/[...path]">) => serve(req, ctx, false));
export const HEAD = route("files.serve", (req: Request, ctx: RouteContext<"/api/files/[...path]">) => serve(req, ctx, true));
