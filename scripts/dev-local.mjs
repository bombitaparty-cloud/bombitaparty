#!/usr/bin/env node
/**
 * Run the whole site locally with the media library — no Neon, no Vercel Blob.
 *
 *   npm run dev:local            local Postgres (.data/pglite) + migrations + next dev on :3000
 *   npm run dev:local -- --db    only the database (e.g. while running media:import)
 *
 * Media files are stored in .data/media. Blob credentials from .env are
 * blanked for the child process, so nothing is written to production storage.
 * To fill the gallery once:  npm run media:import:local -- "media-import/<folder>" --publish
 */
import path from "node:path";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { ROOT } from "./lib/env.mjs";

const port = Number(process.env.DEV_DB_PORT ?? 54329);
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
const env = { ...process.env, DATABASE_URL, DATABASE_URL_READONLY: "", BLOB_READ_WRITE_TOKEN: "", BLOB_STORE_ID: "" };

const db = await PGlite.create(path.join(ROOT, ".data", "pglite"));
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 8 });
await server.start();
console.log(`Local Postgres ready on 127.0.0.1:${port} (.data/pglite)`);

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, env, stdio: "inherit", shell: process.platform === "win32" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`))));
  });

await run("node", ["scripts/db-migrate.mjs"]);

let child;
if (!process.argv.includes("--db")) {
  child = spawn("npx", ["next", "dev", "-p", process.env.PORT ?? "3000"], { cwd: ROOT, env, stdio: "inherit", shell: process.platform === "win32" });
  child.on("exit", (code) => shutdown(code ?? 0));
} else {
  console.log(`Database only. Use: DATABASE_URL=${DATABASE_URL}`);
}

async function shutdown(code = 0) {
  child?.kill();
  await server.stop().catch(() => {});
  await db.close().catch(() => {});
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
