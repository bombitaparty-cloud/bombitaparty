import type { Metadata } from "next";
import { blobUploadFlow, storageMode } from "@/lib/store/events";
import { isDatabaseConfigured } from "@/lib/db";
import { MediaLibrary } from "@/components/admin/media/MediaLibrary";
import { blobAccess } from "@/lib/media/pipeline.mjs";

export const metadata: Metadata = { title: "Media" };

/** Gallery media manager. The panel layout already requires an admin session; every API call re-checks it. */
export default function MediaPage() {
  return (
    <>
      <div>
        <h1 className="font-display text-5xl tracking-wide md:text-6xl">Media</h1>
        <p className="mt-1 text-sm text-mute">Photos and videos for the date-wise gallery. Drafts stay hidden until you publish them.</p>
      </div>
      <div className="mt-8">
        {isDatabaseConfigured() ? (
          <MediaLibrary storage={storageMode} flow={blobUploadFlow} access={blobAccess()} />
        ) : (
          <p className="border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            DATABASE_URL is not configured, so the media library is offline. Add it in Vercel → Settings → Environment Variables, then run the migrations (README → Media).
          </p>
        )}
      </div>
    </>
  );
}
