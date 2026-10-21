import { rateLimit, route } from "@/lib/api";
import { galleryFacets } from "@/lib/media/queries";
import { cachedJson, parseFilters, PUBLIC_CACHE } from "@/lib/media/http";

/** GET /api/gallery/dates — date headings with counts (newest first) + category/tag facets. */
export const GET = route("gallery.dates", async (req: Request) => {
  rateLimit(req, "gallery", 240);
  const { type, category, tag } = parseFilters(new URL(req.url).searchParams);
  return cachedJson(req, await galleryFacets({ type, category, tag }), PUBLIC_CACHE);
});
