import { NextResponse } from "next/server";
import { ApiError, badRequest, readJson, requireAdminApi, route, str } from "@/lib/api";
import { adminAlbums, deleteAlbum, isUuid, saveAlbum, setAlbumCover } from "@/lib/media/queries";
import { isCalendarDate } from "@/lib/media/pipeline.mjs";
import { log } from "@/lib/log";

/**
 * Admin albums (one per gallery night). Session + x-bombita-admin header required.
 *   GET                                   → every night with photos or album details
 *   PUT    { date, title, venue?, city?, category?, description? }  → create / update
 *   PATCH  { coverAssetId }               → make that photo its night's thumbnail
 *   DELETE { date }                       → remove album details (photos untouched)
 */
export const GET = route("admin.albums.list", async (req: Request) => {
  await requireAdminApi(req);
  return NextResponse.json({ albums: await adminAlbums() }, { headers: { "Cache-Control": "private, no-store" } });
});

export const PUT = route("admin.albums.save", async (req: Request) => {
  await requireAdminApi(req);
  const b = await readJson<Record<string, unknown>>(req);
  if (!isCalendarDate(b.date)) throw badRequest("date must be YYYY-MM-DD.");
  const title = str(b.title, 120, "title");
  if (!title) throw badRequest("Give the album a title.");
  await saveAlbum({
    date: b.date,
    title,
    venue: str(b.venue, 120, "venue"),
    city: str(b.city, 60, "city"),
    category: str(b.category, 60, "category"),
    description: str(b.description, 2000, "description"),
  });
  log.info("admin.albums.saved", { date: b.date });
  return NextResponse.json({ ok: true });
});

export const PATCH = route("admin.albums.cover", async (req: Request) => {
  await requireAdminApi(req);
  const { coverAssetId } = await readJson<{ coverAssetId?: unknown }>(req);
  if (!isUuid(coverAssetId)) throw badRequest("coverAssetId must be a photo id.");
  const res = await setAlbumCover(coverAssetId);
  if (!res) throw new ApiError(404, "not_found", "That photo doesn't exist or isn't ready yet.");
  log.info("admin.albums.cover", { date: res.date });
  return NextResponse.json({ ok: true, date: res.date });
});

export const DELETE = route("admin.albums.delete", async (req: Request) => {
  await requireAdminApi(req);
  const { date } = await readJson<{ date?: unknown }>(req);
  if (!isCalendarDate(date)) throw badRequest("date must be YYYY-MM-DD.");
  if (!(await deleteAlbum(date))) throw new ApiError(404, "not_found", "No album details saved for that date.");
  return NextResponse.json({ ok: true });
});
