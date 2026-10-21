#!/usr/bin/env node
/**
 * Database migrations (plain SQL in db/migrations).
 *
 *   node scripts/db-migrate.mjs            apply pending migrations
 *   node scripts/db-migrate.mjs --status   show applied / pending, change nothing
 *   node scripts/db-migrate.mjs --dry-run  inspect the schema and list what would run
 *   node scripts/db-migrate.mjs --down 0001_media --yes-i-have-a-backup
 *
 * Safety:
 *  - Each migration runs in its own transaction and is recorded with a checksum.
 *  - An advisory lock stops two runs from migrating at once.
 *  - Before applying, the existing schema is inspected; if a table the
 *    migration would create already exists (and was not created by this
 *    runner) it stops instead of touching it.
 *  - Applied migrations whose files changed are reported and nothing runs.
 *  - Rollbacks (*.down.sql) only run when explicitly requested with the flag.
 * Uses DATABASE_MIGRATION_URL when set (e.g. an owner role), else DATABASE_URL.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import { ROOT, describeDbUrl, loadEnv, redact, requireDatabaseUrl } from "./lib/env.mjs";

const DIR = path.join(ROOT, "db", "migrations");
const LOCK_ID = 74_221_901; // arbitrary, stable

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const downId = args.includes("--down") ? args[args.indexOf("--down") + 1] : null;

loadEnv();
const url = process.env.DATABASE_MIGRATION_URL ? requireDatabaseUrl("DATABASE_MIGRATION_URL") : requireDatabaseUrl();

const files = fs
  .readdirSync(DIR)
  .filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f) && !f.endsWith(".down.sql"))
  .sort()
  .map((f) => {
    const sql = fs.readFileSync(path.join(DIR, f), "utf8");
    return { id: f.replace(/\.sql$/, ""), sql, checksum: crypto.createHash("sha256").update(sql).digest("hex") };
  });

const tablesCreatedBy = (sql) => [...sql.matchAll(/CREATE\s+(?:TABLE|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase());

const client = new pg.Client({ connectionString: url, application_name: "bombita-migrate" });

async function main() {
  console.log(`Database: ${describeDbUrl(url)}`);
  await client.connect();
  const { rows: [{ version }] } = await client.query("SELECT current_setting('server_version') AS version");
  console.log(`PostgreSQL ${version}`);

  await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
  try {
    const { rows: existing } = await client.query(
      `SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    console.log(`Existing public tables/views: ${existing.length ? existing.map((r) => r.table_name).join(", ") : "(none)"}`);

    const hasLedger = existing.some((r) => r.table_name === "schema_migrations");
    if (!hasLedger && !flag("--status") && !flag("--dry-run")) {
      await client.query(`CREATE TABLE schema_migrations (
        id text PRIMARY KEY,
        checksum char(64) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);
    }
    const applied = hasLedger || (!flag("--status") && !flag("--dry-run"))
      ? (await client.query("SELECT id, checksum, applied_at FROM schema_migrations ORDER BY id")).rows
      : [];
    const appliedById = new Map(applied.map((r) => [r.id, r]));

    const changed = files.filter((f) => appliedById.has(f.id) && appliedById.get(f.id).checksum !== f.checksum);
    if (changed.length) {
      throw new Error(`Applied migration file(s) changed since they ran: ${changed.map((f) => f.id).join(", ")}. Add a new migration instead of editing an applied one.`);
    }
    const pending = files.filter((f) => !appliedById.has(f.id));

    if (downId) return await rollback(downId, appliedById);

    for (const f of files) console.log(`  ${appliedById.has(f.id) ? "applied " : "pending "} ${f.id}${appliedById.has(f.id) ? `  (${appliedById.get(f.id).applied_at.toISOString()})` : ""}`);
    if (flag("--status")) return;

    // Refuse to collide with objects that already exist outside this ledger.
    const names = new Set(existing.map((r) => r.table_name));
    for (const f of pending) {
      const clash = tablesCreatedBy(f.sql).filter((t) => names.has(t));
      if (clash.length) throw new Error(`${f.id} would create ${clash.join(", ")}, which already exist. Inspect the schema before continuing — nothing was changed.`);
    }
    if (flag("--dry-run")) {
      console.log(pending.length ? `Would apply: ${pending.map((f) => f.id).join(", ")}` : "Nothing to apply.");
      return;
    }
    if (!pending.length) return console.log("Database is up to date.");

    for (const f of pending) {
      const t = Date.now();
      await client.query("BEGIN");
      try {
        await client.query(f.sql);
        await client.query("INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)", [f.id, f.checksum]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`${f.id} failed and was rolled back: ${err.message}`);
      }
      console.log(`Applied ${f.id} in ${Date.now() - t} ms`);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
  }
}

async function rollback(id, appliedById) {
  if (!flag("--yes-i-have-a-backup")) throw new Error("Rollbacks delete data. Re-run with --yes-i-have-a-backup after taking a backup / Neon branch.");
  if (!appliedById.has(id)) throw new Error(`${id} is not applied.`);
  const file = path.join(DIR, `${id}.down.sql`);
  if (!fs.existsSync(file)) throw new Error(`No rollback file for ${id}.`);
  await client.query("BEGIN");
  try {
    await client.query(fs.readFileSync(file, "utf8"));
    await client.query("DELETE FROM schema_migrations WHERE id = $1", [id]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
  console.log(`Rolled back ${id}.`);
}

main()
  .catch((err) => {
    console.error(`Migration error: ${redact(err.message)}`);
    process.exitCode = 1;
  })
  .finally(() => client.end().catch(() => {}));
