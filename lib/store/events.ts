import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { del, get, list } from "@vercel/blob";
import { blobPut } from "@/lib/media/pipeline.mjs";
import { events as seedEvents } from "@/data/events";
import type { StoredEvent } from "@/lib/cms/types";

/**
 * Event storage used by the admin dashboard.
 *  - "blob"     → Vercel Blob (production). Every save writes a new versioned
 *                 JSON file; the latest wins and the last 20 are kept as history.
 *  - "local"    → .data/events.json (local development).
 *  - "readonly" → deployed without a Blob store: the seed in data/events.ts is
 *                 shown and the dashboard explains how to enable saving.
 * Until the first save, the seed events from data/events.ts are used.
 */
export type StorageMode = "blob" | "local" | "readonly";

/** Blob auth: a read-write token, or Vercel OIDC + BLOB_STORE_ID (newer store connections). */
const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export const storageMode: StorageMode = hasBlob
  ? "blob"
  : process.env.VERCEL
    ? "readonly"
    : "local";

/** How the browser uploads to Blob: client token (read-write token) or presigned URL (OIDC). */
export const blobUploadFlow: "token" | "presigned" = process.env.BLOB_READ_WRITE_TOKEN ? "token" : "presigned";

/** Prefer an explicit read-write token when one is configured (avoids a dev OIDC token winning). */
export const blobAuth = process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {};

const LOCAL_FILE = path.join(process.cwd(), ".data", "events.json");
const PREFIX = "cms/events-";
const KEEP_VERSIONS = 20;

export function seed(): StoredEvent[] {
  const now = new Date().toISOString();
  return seedEvents.map((e) => ({ ...e, id: e.slug, published: true, createdAt: now, updatedAt: now }));
}

async function latestBlob() {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000, ...blobAuth });
  return blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
}

export async function readEvents(): Promise<StoredEvent[]> {
  if (storageMode === "blob") {
    const [latest] = await latestBlob();
    if (!latest) return seed();
    // Private stores need an authenticated read; public stores also allow a plain fetch.
    const priv = await get(latest.pathname, { access: "private", useCache: false, ...blobAuth }).catch(() => null);
    if (priv?.statusCode === 200) return ((await new Response(priv.stream).json()) as { events: StoredEvent[] }).events;
    const res = await fetch(latest.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not read events (${res.status})`);
    return ((await res.json()) as { events: StoredEvent[] }).events;
  }
  if (storageMode === "local") {
    try {
      return (JSON.parse(await fs.readFile(LOCAL_FILE, "utf8")) as { events: StoredEvent[] }).events;
    } catch {
      return seed();
    }
  }
  return seed();
}

export async function writeEvents(events: StoredEvent[]): Promise<void> {
  const body = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), events }, null, 2);
  if (storageMode === "blob") {
    await blobPut(`${PREFIX}${Date.now()}.json`, body, { contentType: "application/json", addRandomSuffix: true, ...blobAuth });
    const old = (await latestBlob()).slice(KEEP_VERSIONS);
    if (old.length) await del(old.map((b) => b.url), blobAuth);
    return;
  }
  if (storageMode === "local") {
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, body, "utf8");
    return;
  }
  throw new Error("Saving is disabled: connect a Vercel Blob store to this project (see README → Admin).");
}
