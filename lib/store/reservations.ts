import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { get, list, put } from "@vercel/blob";
import { blobAuth, storageMode } from "./events";
import { NOTES_MAX } from "@/lib/utils/validation";

/**
 * Birthday / VIP table / group-night requests from /birthdays.
 *
 * Blob mode stores each request as its own private JSON object, so
 * simultaneous requests never overwrite each other (a ".pub" name marks
 * the rare store that only allows public objects). Local mode appends to
 * .data/reservations.json.
 */
export interface Reservation {
  name: string;
  phone: string;
  email: string;
  type: string;
  /** Requested night, YYYY-MM-DD (New York). */
  date: string;
  guests: number;
  notes?: string;
  at: string;
}

const PREFIX = "reservations/v1/";
const LOCAL_FILE = path.join(process.cwd(), ".data", "reservations.json");

const clip = (v: string, n: number) => v.trim().slice(0, n);

export async function addReservation(input: Omit<Reservation, "at">): Promise<boolean> {
  const record: Reservation = {
    name: clip(input.name, 80),
    phone: clip(input.phone, 24),
    email: clip(input.email, 120).toLowerCase(),
    type: clip(input.type, 40),
    date: clip(input.date, 10),
    guests: input.guests,
    notes: clip(input.notes ?? "", NOTES_MAX) || undefined,
    at: new Date().toISOString(),
  };

  if (storageMode === "blob") {
    const id = `${PREFIX}${Date.now()}_${randomBytes(8).toString("hex")}`;
    const body = JSON.stringify(record);
    const opts = { addRandomSuffix: false, contentType: "application/json", ...blobAuth } as const;
    try {
      await put(`${id}.json`, body, { ...opts, access: "private" });
    } catch {
      // Store created as public-only: the record still sits behind an unguessable path.
      await put(`${id}.pub.json`, body, { ...opts, access: "public" });
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

  console.warn("[reservation] no storage connected — request not saved");
  return false;
}

async function readLocal(): Promise<Reservation[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8")) as Reservation[];
  } catch {
    return [];
  }
}

/** Every request, newest first. */
export async function listReservations(): Promise<Reservation[]> {
  let records: Reservation[] = [];
  if (storageMode === "blob") {
    const paths: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: PREFIX, limit: 1000, cursor, ...blobAuth });
      paths.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    const read = async (pathname: string) => {
      try {
        const res = await get(pathname, { access: pathname.endsWith(".pub.json") ? "public" : "private", ...blobAuth });
        if (!res || res.statusCode !== 200) return null;
        return JSON.parse(await new Response(res.stream).text()) as Reservation;
      } catch {
        return null;
      }
    };
    // Read in small batches to stay well inside rate limits.
    for (let i = 0; i < paths.length; i += 20) {
      const batch = await Promise.all(paths.slice(i, i + 20).map(read));
      records.push(...batch.filter((r): r is Reservation => r !== null));
    }
  } else if (storageMode === "local") {
    records = await readLocal();
  }
  return records.sort((a, b) => b.at.localeCompare(a.at));
}
