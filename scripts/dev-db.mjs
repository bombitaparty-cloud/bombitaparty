#!/usr/bin/env node
/**
 * Local, throwaway PostgreSQL for development and tests (PGlite, PG 17).
 * Never touches Neon.
 *
 *   node scripts/dev-db.mjs                 persistent DB in .data/pglite on :54329
 *   node scripts/dev-db.mjs --memory        in-memory (tests)
 *
 * Then: DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/postgres
 */
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { ROOT } from "./lib/env.mjs";

const memory = process.argv.includes("--memory");
const port = Number(process.env.DEV_DB_PORT ?? 54329);
const db = memory ? await PGlite.create() : await PGlite.create(path.join(ROOT, ".data", "pglite"));
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 8 });
await server.start();
console.log(`dev-db ready on 127.0.0.1:${port} (${memory ? "in-memory" : ".data/pglite"})`);

const stop = async () => {
  await server.stop().catch(() => {});
  await db.close().catch(() => {});
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
