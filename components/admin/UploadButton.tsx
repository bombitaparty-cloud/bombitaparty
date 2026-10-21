"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { upload, uploadPresigned } from "@vercel/blob/client";
import type { StorageMode } from "@/lib/store/events";
import { cn } from "@/lib/utils";

/**
 * Uploads a file and returns its URL. Blob mode uploads straight from the
 * browser to Vercel Blob; local mode posts to /api/admin/upload.
 */
export function UploadButton({
  storage,
  flow = "token",
  access = "private",
  accept = "image/*",
  multiple,
  onUploaded,
  label = "Upload",
  className,
}: {
  storage: StorageMode;
  /** Blob upload flow, decided on the server (see lib/store/events). */
  flow?: "token" | "presigned";
  /** The Blob store's access mode. Private uploads are served through /api/files. */
  access?: "public" | "private";
  accept?: string;
  multiple?: boolean;
  onUploaded: (urls: string[]) => void;
  label?: string;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function send(file: File): Promise<string> {
    if (storage === "blob") {
      const pathname = `events/${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-")}`;
      const blob =
        flow === "presigned"
          ? await uploadPresigned(pathname, file, { access, handleUploadUrl: "/api/admin/upload", contentType: file.type })
          : await upload(pathname, file, { access, handleUploadUrl: "/api/admin/upload" });
      return access === "private" ? `/api/files/${blob.pathname}` : blob.url;
    }
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body });
    const json = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
    return json.url;
  }

  async function onChange(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(undefined);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await send(f));
      onUploaded(urls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const disabled = busy || storage === "readonly";
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className={cn(
          "inline-flex h-10 items-center gap-2 border border-gold-400/60 px-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-300 hover:bg-gold-400 hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {busy ? "Uploading…" : label}
      </button>
      <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => onChange(e.target.files)} />
      {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
    </span>
  );
}
