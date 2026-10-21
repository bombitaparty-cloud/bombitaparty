import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionValue } from "@/lib/admin/auth";
import { blobAuth, blobUploadFlow, storageMode } from "@/lib/store/events";

/**
 * Admin uploads (flyers, gallery images, short videos).
 *  - Blob mode: issues a client-upload token (the browser uploads straight to
 *    Vercel Blob, so large files never pass through this function).
 *  - Local mode: accepts multipart form data and writes to /public/uploads.
 */
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_BYTES = 200 * 1024 * 1024;

async function authed() {
  return verifySessionValue((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function POST(req: Request) {
  if (storageMode === "blob" && blobUploadFlow === "presigned") {
    // OIDC-connected store: issue a short-lived, put-only signed token per upload.
    const body = (await req.json()) as HandleUploadPresignedBody;
    if (body.type === "blob.generate-presigned-url" && !(await authed())) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    try {
      const result = await handleUploadPresigned({
        body,
        request: req,
        getSignedToken: async (pathname) => ({
          token: await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: [...IMAGE_TYPES, ...VIDEO_TYPES],
            maximumSizeInBytes: MAX_BYTES,
            validUntil: Date.now() + 10 * 60 * 1000,
            ...blobAuth,
          }),
          urlOptions: { allowedContentTypes: [...IMAGE_TYPES, ...VIDEO_TYPES], maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true },
        }),
      });
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 400 });
    }
  }

  if (storageMode === "blob") {
    // Read-write token store: classic client-token flow.
    const body = (await req.json()) as HandleUploadBody;
    // Token requests need an admin session; the completion callback comes from
    // Vercel Blob itself and is verified by handleUpload's signature check.
    if (body.type === "blob.generate-client-token" && !(await authed())) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    try {
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: [...IMAGE_TYPES, ...VIDEO_TYPES],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        }),
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 400 });
    }
  }

  if (!(await authed())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (storageMode === "local") {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (![...IMAGE_TYPES, ...VIDEO_TYPES].includes(file.type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60);
    const name = `${Date.now()}-${safe}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/${name}` });
  }

  return NextResponse.json({ error: "Uploads are disabled until a Vercel Blob store is connected." }, { status: 503 });
}
