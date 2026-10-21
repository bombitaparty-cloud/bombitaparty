import "server-only";
import pg from "pg";
import { log } from "@/lib/log";

/**
 * PostgreSQL (Neon) access for server code only — never imported by client
 * components ("server-only" makes that a build error).
 *
 *  - DATABASE_URL            admin / write role (Neon pooled connection string)
 *  - DATABASE_URL_READONLY   optional read-only role for public gallery reads;
 *                            falls back to DATABASE_URL when not set
 *
 * One small pool per server instance. On Vercel each function instance keeps
 * at most a few connections and Neon's PgBouncer pooler fans them in.
 * All queries are parameterized ($1, $2 …) — never string-concatenated.
 */

// DATE columns stay "YYYY-MM-DD" strings (pg would otherwise create local-midnight Dates and shift days).
pg.types.setTypeParser(1082, (v) => v);
// BIGINT counts fit comfortably in a JS number here.
pg.types.setTypeParser(20, (v) => Number(v));

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
  }
}

function validate(name: string): string | null {
  const url = process.env[name];
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`${name} is not a valid URL`);
  }
  if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") throw new Error(`${name} must be a postgres:// URL`);
  if (u.hostname.endsWith("neon.tech") && !["require", "verify-full"].includes(u.searchParams.get("sslmode") ?? ""))
    throw new Error(`${name} must use sslmode=require for Neon`);
  return url;
}

type Pools = { admin: pg.Pool; read: pg.Pool };
const g = globalThis as unknown as { __bombitaPools?: Pools };

function makePool(url: string, role: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    application_name: `bombita-web-${role}`,
  });
  pool.on("error", (err) => log.error("db.pool_error", { role, error: err.message }));
  return pool;
}

function pools(): Pools {
  if (g.__bombitaPools) return g.__bombitaPools;
  const adminUrl = validate("DATABASE_URL");
  if (!adminUrl) throw new DatabaseNotConfiguredError();
  const readUrl = validate("DATABASE_URL_READONLY");
  const admin = makePool(adminUrl, "admin");
  g.__bombitaPools = { admin, read: readUrl ? makePool(readUrl, "read") : admin };
  return g.__bombitaPools;
}

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

/** Pool for public, read-only gallery queries. */
export const readDb = () => pools().read;
/** Pool for admin reads and all writes. */
export const adminDb = () => pools().admin;

/** Runs fn inside BEGIN/COMMIT on the admin pool; rolls back on any error. */
export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await adminDb().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
