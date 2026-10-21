import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { list, put } from "@vercel/blob";
import { blobAuth, storageMode } from "./events";

/**
 * Email signups (gallery unlock, Join the list, footer, RSVP, birthday requests).
 *
 * Blob mode stores every signup as its own tiny object, so concurrent signups
 * can never overwrite each other. The record is encoded in the object's
 * pathname, which lets the admin read the whole list with list() alone
 * (no per-item downloads). Objects are written as private when the store
 * supports it. Local mode appends to .data/subscribers.json.
 */
export type SignupSource = "gallery" | "join" | "footer" | "rsvp" | "birthday";

export const SOURCE_LABEL: Record<SignupSource, string> = {
  gallery: "Gallery unlock",
  join: "Join the list",
  footer: "Footer signup",
  rsvp: "Event RSVP",
  birthday: "Birthday / VIP request",
};

export interface SignupRecord {
  email: string;
  name?: string;
  city?: string;
  source: SignupSource;
  /** Event slug for RSVPs. */
  event?: string;
  at: string;
}

export interface Subscriber {
  email: string;
  name?: string;
  city?: string;
  sources: SignupSource[];
  events: string[];
  firstSeen: string;
  lastSeen: string;
  count: number;
}

const PREFIX = "subscribers/v1/";
const LOCAL_FILE = path.join(process.cwd(), ".data", "subscribers.json");

const encode = (r: SignupRecord) => Buffer.from(JSON.stringify(r)).toString("base64url");
const decode = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as SignupRecord;
const clip = (v?: string, n = 80) => (v ? v.trim().slice(0, n) || undefined : undefined);

export async function addSignup(input: Omit<SignupRecord, "at">): Promise<boolean> {
  const record: SignupRecord = {
    email: input.email.trim().toLowerCase().slice(0, 200),
    name: clip(input.name),
    city: clip(input.city, 40),
    source: input.source,
    event: clip(input.event, 100),
    at: new Date().toISOString(),
  };

  if (storageMode === "blob") {
    const key = `${PREFIX}${Date.now()}_${randomBytes(6).toString("hex")}/${encode(record)}.json`;
    const opts = { addRandomSuffix: false, contentType: "application/json", ...blobAuth } as const;
    try {
      await put(key, "{}", { ...opts, access: "private" });
    } catch {
      // Store created as public-only: the record still sits behind an unguessable path.
      await put(key, "{}", { ...opts, access: "public" });
    }
    return true;
  }

  if (storageMode === "local") {
    const all = await readLocal();
    all.push(record);
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, JSON.stringify(all, null, 2), "utf8");
    return true;
  }

  console.warn("[signup] no storage connected — signup not saved", record.source);
  return false;
}

async function readLocal(): Promise<SignupRecord[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8")) as SignupRecord[];
  } catch {
    return [];
  }
}

/** Every signup event, newest first. */
export async function listSignups(): Promise<SignupRecord[]> {
  let records: SignupRecord[] = [];
  if (storageMode === "blob") {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: PREFIX, limit: 1000, cursor, ...blobAuth });
      for (const b of page.blobs) {
        const name = b.pathname.split("/").pop()?.replace(/\.json$/, "");
        if (!name) continue;
        try {
          records.push(decode(name));
        } catch {
          /* skip malformed */
        }
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } else if (storageMode === "local") {
    records = await readLocal();
  }
  return records.sort((a, b) => b.at.localeCompare(a.at));
}

/** One row per email: latest name/city, every source, first & last signup. */
export function aggregate(records: SignupRecord[]): Subscriber[] {
  const map = new Map<string, Subscriber>();
  for (const r of [...records].sort((a, b) => a.at.localeCompare(b.at))) {
    const s = map.get(r.email);
    if (!s) {
      map.set(r.email, {
        email: r.email,
        name: r.name,
        city: r.city,
        sources: [r.source],
        events: r.event ? [r.event] : [],
        firstSeen: r.at,
        lastSeen: r.at,
        count: 1,
      });
      continue;
    }
    s.name = r.name || s.name;
    s.city = r.city || s.city;
    if (!s.sources.includes(r.source)) s.sources.push(r.source);
    if (r.event && !s.events.includes(r.event)) s.events.push(r.event);
    s.lastSeen = r.at;
    s.count++;
  }
  return [...map.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}
