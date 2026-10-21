import { NextResponse } from "next/server";
import { badRequest, readJson, requireAdminApi, route } from "@/lib/api";
import { findByChecksums } from "@/lib/media/queries";

/** POST /api/admin/media/check { checksums: string[] } → which files are already in the library. */
export const POST = route("admin.media.check", async (req: Request) => {
  await requireAdminApi(req);
  const { checksums } = await readJson<{ checksums?: unknown }>(req);
  if (!Array.isArray(checksums) || checksums.length > 1000 || !checksums.every((c) => typeof c === "string" && /^[0-9a-f]{64}$/.test(c))) {
    throw badRequest("checksums must be up to 1000 SHA-256 hex digests.");
  }
  return NextResponse.json({ existing: await findByChecksums(checksums as string[]) }, { headers: { "Cache-Control": "private, no-store" } });
});
