import { ApiError, rateLimit, route } from "@/lib/api";
import { getPublished } from "@/lib/media/queries";
import { cachedJson, PUBLIC_CACHE } from "@/lib/media/http";

/** GET /api/gallery/:id — one published asset's metadata (404 for drafts / unknown ids). */
export const GET = route("gallery.item", async (req: Request, ctx: RouteContext<"/api/gallery/[id]">) => {
  rateLimit(req, "gallery", 240);
  const { id } = await ctx.params;
  const item = await getPublished(id);
  if (!item) throw new ApiError(404, "not_found", "No published asset with that id.");
  return cachedJson(req, item, PUBLIC_CACHE);
});
