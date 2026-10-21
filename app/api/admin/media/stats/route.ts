import { NextResponse } from "next/server";
import { requireAdminApi, route } from "@/lib/api";
import { mediaStats } from "@/lib/media/queries";

/** GET /api/admin/media/stats — asset counts by status/type and storage usage. */
export const GET = route("admin.media.stats", async (req: Request) => {
  await requireAdminApi(req);
  return NextResponse.json(await mediaStats(), { headers: { "Cache-Control": "private, no-store" } });
});
