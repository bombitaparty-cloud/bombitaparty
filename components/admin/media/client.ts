"use client";

/** Browser helpers for the admin media manager. Every write sends the admin CSRF header. */

export class AdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function adminFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), "x-bombita-admin": "1", ...init.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new AdminApiError(res.status, body?.error?.message ?? `Request failed (${res.status})`);
  return body as T;
}

/** multipart POST with upload progress (fetch can't report it). */
export function postWithProgress<T>(url: string, form: FormData, onProgress: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("x-bombita-admin", "1");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { error?: { message?: string } } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else reject(new AdminApiError(xhr.status, body?.error?.message ?? `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new AdminApiError(0, "Network error — check your connection and retry."));
    xhr.send(form);
  });
}

export async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const DATE_IN_PATH = /(\d{4})[-_](\d{2})[-_](\d{2})/;
export function folderDate(relativePath: string): string | null {
  const dirs = relativePath.split("/").slice(0, -1).reverse();
  for (const d of dirs) {
    const m = DATE_IN_PATH.exec(d);
    if (m) {
      const iso = `${m[1]}-${m[2]}-${m[3]}`;
      const t = new Date(`${iso}T12:00:00Z`);
      if (!isNaN(+t) && t.toISOString().slice(0, 10) === iso) return iso;
    }
  }
  return null;
}

/** EXIF capture date exactly as the camera recorded it (calendar date + instant when an offset exists). */
export async function exifCapture(file: File): Promise<{ capturedAt: string | null; localDate: string | null }> {
  try {
    const exifr = (await import("exifr")).default;
    const t = await exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal", "OffsetTime"], reviveValues: false });
    const raw = t?.DateTimeOriginal ?? t?.CreateDate;
    const m = typeof raw === "string" ? /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(raw) : null;
    if (!m || m[1] === "0000") return { capturedAt: null, localDate: null };
    const localDate = `${m[1]}-${m[2]}-${m[3]}`;
    const off = t?.OffsetTimeOriginal ?? t?.OffsetTime;
    const capturedAt = typeof off === "string" && /^[+-]\d{2}:\d{2}$/.test(off) ? new Date(`${localDate}T${m[4]}:${m[5]}:${m[6]}${off}`).toISOString() : null;
    return { capturedAt, localDate };
  } catch {
    return { capturedAt: null, localDate: null };
  }
}

const UPLOAD_BUDGET = 3.8 * 1024 * 1024;

async function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
}

/**
 * Downscale an image in the browser (≤ 2560 px, EXIF orientation applied) so it
 * fits the server's 4 MB request limit. The server re-encodes it to WebP variants.
 */
export async function downscaleImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const width = bitmap.width;
  const height = bitmap.height;
  try {
    for (const max of [2560, 2048, 1600]) {
      const scale = Math.min(1, max / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const q of [0.88, 0.8, 0.7]) {
        let blob = await canvasBlob(canvas, "image/webp", q);
        if (!blob || blob.type !== "image/webp") blob = await canvasBlob(canvas, "image/jpeg", q); // Safari: no WebP encoder
        if (blob && blob.size <= UPLOAD_BUDGET) return { blob, width, height };
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error("Could not shrink this image under 4 MB.");
}

/** Poster frame + facts for a video, read in the browser. */
export async function videoFacts(file: File): Promise<{ poster: Blob; width: number; height: number; duration: number }> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    await new Promise<void>((res, rej) => {
      v.onloadedmetadata = () => res();
      v.onerror = () => rej(new Error("This browser can't read that video."));
    });
    const duration = v.duration;
    v.currentTime = Math.min(1, duration / 3 || 0);
    await new Promise<void>((res) => (v.onseeked = () => res()));
    const scale = Math.min(1, 1920 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
    const poster = await canvasBlob(canvas, "image/jpeg", 0.85);
    if (!poster) throw new Error("Could not capture a poster frame.");
    return { poster, width: v.videoWidth, height: v.videoHeight, duration };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const formatBytes = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : `${n} B`;
