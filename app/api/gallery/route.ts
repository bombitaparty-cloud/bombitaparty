import { badRequest, rateLimit, route } from "@/lib/api";
import { listPublished } from "@/lib/media/queries";
import { cachedJson, parseFilters, PUBLIC_CACHE } from "@/lib/media/http";

/**
 * GET /api/gallery — published gallery items, newest night first.
 *   ?cursor=…&limit=24&date=YYYY-MM-DD&from=…&to=…&type=image|video&category=…&tag=…
 * Metadata + rendition URLs only (never bytes). Cursor-paginated.
 */
export const GET = route("gallery.list", async (req: Request) => {
  rateLimit(req, "gallery", 240);
  const sp = new URL(req.url).searchParams;
  const limit = Number(sp.get("limit") ?? 24);
  if (!Number.isInteger(limit) || limit < 1 || limit > 60) throw badRequest("limit must be 1–60.");
  try {
    const page = await listPublished(parseFilters(sp), { cursor: sp.get("cursor"), limit });
    return cachedJson(req, page, PUBLIC_CACHE);
  } catch (err) {
    if (err instanceof RangeError) throw badRequest("Invalid cursor.");
    throw err;
  }
});
