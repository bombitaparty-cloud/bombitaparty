#!/usr/bin/env node
/**
 * Import date-wise photos and videos into the gallery.
 *
 *   node scripts/media-import.mjs <folder> [options]
 *   node scripts/media-import.mjs --verify            re-check every stored variant
 *
 * Options
 *   --event-date YYYY-MM-DD   event night for the whole folder (date source "event")
 *   --event <slug>            link assets to an event (e.g. cerrando-el-verano)
 *   --date YYYY-MM-DD         fallback date for files with no capture/folder date ("manual")
 *   --category <name>         e.g. "Live Artists"
 *   --tags a,b,c              tags for every file
 *   --publish                 publish immediately (default: draft, review in /admin/media)
 *   --concurrency <n>         parallel files (default 3)
 *   --storage local|vercel-blob   default: vercel-blob when a Blob token is configured
 *   --resume <run-id>         skip files already finished in that run
 *   --dry-run                 inspect + report only; writes nothing
 *   --limit <n>               only the first n files (smoke tests)
 *
 * Date rules (never invented): --event-date → EXIF capture date → a
 * YYYY-MM-DD (or YYYY_MM_DD) folder name → --date. Files with none are
 * reported as "invalid: no reliable date".
 * Originals are never modified or deleted.
 */
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pg from "pg";
import { ROOT, describeDbUrl, loadEnv, redact, requireDatabaseUrl } from "./lib/env.mjs";
import { LIMITS, createAsset, createStorage, imageVariants, isCalendarDate, localPath, readCapture, sniff } from "../lib/media/pipeline.mjs";

const run = promisify(execFile);
const argv = process.argv.slice(2);
const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const has = (name) => argv.includes(name);

loadEnv();
const dbUrl = requireDatabaseUrl();
pg.types.setTypeParser(1082, (v) => v); // keep DATE as "YYYY-MM-DD"
const pool = new pg.Pool({ connectionString: dbUrl, max: 4, application_name: "bombita-import" });

const EXT = /\.(jpe?g|png|webp|avif|gif|mp4|mov|m4v|webm)$/i;

async function discover(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "__MACOSX") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await discover(p)));
    else if (entry.isFile() && EXT.test(entry.name)) out.push(p);
  }
  return out.sort();
}

async function hashFile(file) {
  const h = crypto.createHash("sha256");
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest("hex");
}

function dirDate(file, root) {
  for (const seg of path.relative(root, path.dirname(file)).split(path.sep).reverse()) {
    const m = /(\d{4})[-_](\d{2})[-_](\d{2})/.exec(seg);
    if (m && isCalendarDate(`${m[1]}-${m[2]}-${m[3]}`)) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return null;
}

async function hasFfmpeg() {
  try {
    await run("ffprobe", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

async function probeVideo(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation:format=duration:format_tags=creation_time", "-of", "json", file]);
  const j = JSON.parse(stdout);
  const s = j.streams?.[0] ?? {};
  const rot = Math.abs(Number(s.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0));
  const [w, h] = rot === 90 || rot === 270 ? [s.height, s.width] : [s.width, s.height];
  const created = j.format?.tags?.creation_time;
  return { width: w ?? null, height: h ?? null, duration: j.format?.duration ? Number(j.format.duration) : null, createdAt: created && !isNaN(Date.parse(created)) ? new Date(created).toISOString() : null };
}

async function videoVariants(file, tmp) {
  const web = path.join(tmp, "web.mp4");
  const poster = path.join(tmp, "poster.jpg");
  await run("ffmpeg", ["-v", "error", "-y", "-i", file, "-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale='min(1280,iw)':-2,fps=30", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-maxrate", "2500k", "-bufsize", "5000k", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", web], { maxBuffer: 1 << 24 });
  await run("ffmpeg", ["-v", "error", "-y", "-ss", "1", "-i", web, "-frames:v", "1", "-q:v", "3", poster]);
  const [webBuf, posterBuf] = await Promise.all([fs.readFile(web), fs.readFile(poster)]);
  const img = await imageVariants(posterBuf);
  const meta = await probeVideo(web);
  return [
    { kind: "video", buffer: webBuf, width: meta.width, height: meta.height, mime: "video/mp4" },
    ...img.variants.filter((v) => v.kind !== "large").map((v) => ({ ...v, kind: v.kind === "display" ? "poster" : v.kind })),
  ];
}

async function verifyVariant(v) {
  if (v.storage_backend === "local") {
    const st = await fs.stat(localPath(v.storage_key)).catch(() => null);
    return st && st.size === Number(v.file_size_bytes) ? null : "missing or wrong size on disk";
  }
  if (!v.cdn_url) {
    // Private object: ask the store directly.
    const { head } = await import("@vercel/blob");
    const meta = await head(v.storage_key, process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}).catch(() => null);
    if (!meta) return "missing from Blob";
    return meta.size === Number(v.file_size_bytes) ? null : `size ${meta.size} ≠ ${v.file_size_bytes}`;
  }
  const res = await fetch(v.cdn_url, { method: "HEAD" }).catch((e) => ({ ok: false, status: e.message }));
  if (!res.ok) return `HTTP ${res.status}`;
  const len = Number(res.headers.get("content-length"));
  return len && len !== Number(v.file_size_bytes) ? `size ${len} ≠ ${v.file_size_bytes}` : null;
}

async function verifyAll(ids) {
  const { rows } = await pool.query(
    `SELECT a.id, a.original_filename, v.kind, v.storage_backend, v.storage_key, v.cdn_url, v.file_size_bytes
       FROM media_assets a JOIN media_variants v ON v.asset_id = a.id
      WHERE a.status = 'ready' ${ids ? "AND a.id = ANY($1)" : ""}`,
    ids ? [ids] : [],
  );
  const failures = [];
  let i = 0;
  const queue = [...rows];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let v = queue.shift(); v; v = queue.shift()) {
        const err = await verifyVariant(v);
        if (err) failures.push({ id: v.id, file: v.original_filename, kind: v.kind, error: err });
        if (++i % 100 === 0) console.log(`  verified ${i}/${rows.length}`);
      }
    }),
  );
  return { checked: rows.length, failures };
}

async function main() {
  console.log(`Database: ${describeDbUrl(dbUrl)}`);
  if (has("--verify")) {
    const r = await verifyAll();
    console.log(`Verified ${r.checked} variants: ${r.failures.length} problem(s).`);
    for (const f of r.failures) console.log(`  ✗ ${f.file} [${f.kind}] ${f.error}`);
    process.exitCode = r.failures.length ? 1 : 0;
    return;
  }

  const VALUED = new Set(["--event-date", "--event", "--date", "--category", "--tags", "--concurrency", "--storage", "--resume", "--limit"]);
  const source = argv.find((a, i) => !a.startsWith("--") && !VALUED.has(argv[i - 1]));
  if (!source) throw new Error("Pass the folder to import. See the header of this script for options.");
  const root = path.resolve(source);
  const stat = await fs.stat(root).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`Not a folder: ${source}`);

  const eventDate = opt("--event-date");
  const fallbackDate = opt("--date");
  for (const [flag, v] of [["--event-date", eventDate], ["--date", fallbackDate]]) if (v && !isCalendarDate(v)) throw new Error(`${flag} must be YYYY-MM-DD`);
  const tags = (opt("--tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const concurrency = Math.max(1, Math.min(8, Number(opt("--concurrency") ?? 3)));
  const dry = has("--dry-run");
  const storage = createStorage({ backend: /** @type {any} */ (opt("--storage")) });
  const ffmpeg = await hasFfmpeg();

  let files = await discover(root);
  if (opt("--limit")) files = files.slice(0, Number(opt("--limit")));
  const totalBytes = (await Promise.all(files.map((f) => fs.stat(f).then((s) => s.size)))).reduce((a, b) => a + b, 0);
  console.log(`Found ${files.length} media file(s), ${(totalBytes / 1e6).toFixed(1)} MB in ${root}`);
  console.log(`Storage: ${storage.backend}${dry ? " (dry run — nothing written)" : ""} · concurrency ${concurrency} · ffmpeg ${ffmpeg ? "yes" : "no"}`);

  let runId = opt("--resume");
  const done = new Set();
  if (runId) {
    const prev = await pool.query("SELECT source_path FROM media_import_items WHERE run_id = $1 AND status IN ('imported', 'duplicate')", [runId]);
    prev.rows.forEach((r) => done.add(r.source_path));
    await pool.query("UPDATE media_import_runs SET status = 'running', finished_at = NULL WHERE id = $1", [runId]);
    console.log(`Resuming run ${runId}: ${done.size} file(s) already finished.`);
  } else if (!dry) {
    runId = (await pool.query("INSERT INTO media_import_runs (source) VALUES ($1) RETURNING id", [`import:${path.basename(root)}`])).rows[0].id;
  }

  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) process.exit(130);
    stopping = true;
    console.log("\nStopping after the files in progress… (Ctrl+C again to force)");
  });

  const results = [];
  const counts = { imported: 0, duplicate: 0, invalid: 0, failed: 0, skipped: 0 };
  const queue = files.map((f, i) => ({ file: f, index: i }));
  const t0 = Date.now();
  let finished = 0;

  const record = async (file, status, extra = {}) => {
    counts[status === "skipped" ? "skipped" : status]++;
    results.push({ file: path.relative(root, file), status, ...extra });
    finished++;
    const pct = Math.round((finished / files.length) * 100);
    const label = extra.dryRun ? `would ${status === "imported" ? "add" : "skip"}` : status;
    console.log(`[${String(finished).padStart(String(files.length).length)}/${files.length} ${String(pct).padStart(3)}%] ${label.padEnd(10)} ${path.relative(root, file)}${extra.error ? ` — ${extra.error}` : ""}${extra.galleryDate ? ` → ${extra.galleryDate}` : ""}`);
    if (!dry && runId && status !== "skipped") {
      await pool.query(
        `INSERT INTO media_import_items (run_id, source_path, checksum_sha256, status, asset_id, error)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (run_id, source_path) DO UPDATE SET status = EXCLUDED.status, asset_id = EXCLUDED.asset_id, error = EXCLUDED.error, checksum_sha256 = EXCLUDED.checksum_sha256, finished_at = now()`,
        [runId, path.relative(root, file), extra.checksum ?? null, status, extra.id ?? null, extra.error ?? null],
      );
    }
  };

  async function processOne({ file, index }) {
    const rel = path.relative(root, file);
    if (done.has(rel)) return record(file, "skipped", { note: "finished in resumed run" });
    const st = await fs.stat(file);
    if (st.size > LIMITS.importMaxBytes) return record(file, "invalid", { error: `larger than ${LIMITS.importMaxBytes / 1e9} GB` });

    const fh = await fs.open(file, "r");
    const head = Buffer.alloc(64);
    await fh.read(head, 0, 64, 0);
    await fh.close();
    const kind = sniff(head);
    if (!kind.mime) return record(file, "invalid", { error: kind.reason });
    if (kind.mediaType === "video" && !ffmpeg) return record(file, "invalid", { error: "ffmpeg/ffprobe not installed — needed for videos" });

    const checksum = await hashFile(file);
    let capturedAt = null;
    let captureDate = null;
    let width = null;
    let height = null;
    let duration = null;
    let buf = null;
    if (kind.mediaType === "image") {
      buf = await fs.readFile(file);
      ({ capturedAt, localDate: captureDate } = await readCapture(buf));
    } else {
      const meta = await probeVideo(file);
      ({ width, height, duration } = meta);
      capturedAt = meta.createdAt;
      // Container creation_time is UTC; use its New York calendar date.
      captureDate = capturedAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(capturedAt)) : null;
    }

    const fromDir = dirDate(file, root);
    const [galleryDate, dateSource] = eventDate
      ? [eventDate, "event"]
      : captureDate
        ? [captureDate, "capture"]
        : fromDir
          ? [fromDir, "directory"]
          : fallbackDate
            ? [fallbackDate, "manual"]
            : [null, null];
    if (!galleryDate) return record(file, "invalid", { checksum, error: "no reliable date (no EXIF/folder date); pass --date YYYY-MM-DD" });

    if (dry) {
      const dup = await pool.query("SELECT id FROM media_assets WHERE checksum_sha256 = $1 AND status <> 'failed'", [checksum]);
      return record(file, dup.rows[0] ? "duplicate" : "imported", { checksum, galleryDate, dateSource, dryRun: true });
    }

    try {
      let variants;
      const res = await createAsset(pool, storage, {
        originalFilename: path.basename(file),
        mimeType: kind.mime,
        mediaType: kind.mediaType,
        fileSizeBytes: st.size,
        checksum,
        width,
        height,
        durationSeconds: duration,
        capturedAt,
        galleryDate,
        dateSource,
        eventSlug: opt("--event") ?? null,
        category: opt("--category") ?? null,
        tags,
        publish: has("--publish"),
        displayOrder: index,
        sourceLocation: `import:${path.basename(root)}/${rel.split(path.sep).join("/")}`,
        // On --resume, rows a crashed run left in "processing" are retried right away.
        staleAfterMs: opt("--resume") ? 0 : undefined,
        variants: async () => {
          if (kind.mediaType === "image") {
            const out = await imageVariants(buf);
            await pool.query("UPDATE media_assets SET width = $2, height = $3 WHERE checksum_sha256 = $1", [checksum, out.width, out.height]);
            variants = out.variants;
            return out.variants;
          }
          const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "bombita-vid-"));
          try {
            variants = await videoVariants(file, tmp);
            return variants;
          } finally {
            await fs.rm(tmp, { recursive: true, force: true });
          }
        },
      });
      const webBytes = variants?.reduce((n, v) => n + v.buffer.byteLength, 0);
      return record(file, res.status, { id: res.id, checksum, galleryDate, dateSource, webBytes });
    } catch (err) {
      return record(file, "failed", { checksum, error: redact(err?.message ?? err) });
    } finally {
      buf = null;
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let job = queue.shift(); job && !stopping; job = queue.shift()) await processOne(job);
    }),
  );

  const secs = (Date.now() - t0) / 1000;
  const imported = results.filter((r) => r.status === "imported" && r.id).map((r) => r.id);
  let verification = null;
  if (!dry && imported.length) {
    console.log(`Verifying ${imported.length} imported asset(s)…`);
    verification = await verifyAll(imported);
  }
  const interrupted = stopping && queue.length > 0;
  if (!dry && runId) {
    await pool.query("UPDATE media_import_runs SET status = $2, finished_at = now() WHERE id = $1", [runId, interrupted ? "interrupted" : counts.failed ? "failed" : "completed"]);
  }

  const report = {
    runId: runId ?? null,
    source: root,
    storage: storage.backend,
    dryRun: dry,
    interrupted,
    files: files.length,
    sourceBytes: totalBytes,
    counts,
    webBytes: results.reduce((n, r) => n + (r.webBytes ?? 0), 0),
    seconds: Math.round(secs),
    verification,
    results,
  };
  const dir = path.join(ROOT, "media-import", "reports");
  await fs.mkdir(dir, { recursive: true });
  const reportFile = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}${dry ? "-dry" : ""}.json`);
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

  console.log("\n──────── Import summary ────────");
  console.log(`imported ${counts.imported} · duplicates ${counts.duplicate} · invalid ${counts.invalid} · failed ${counts.failed} · skipped ${counts.skipped}`);
  console.log(`source ${(totalBytes / 1e6).toFixed(1)} MB → web variants ${(report.webBytes / 1e6).toFixed(1)} MB in ${secs.toFixed(1)} s`);
  if (verification) console.log(`verification: ${verification.checked} variants checked, ${verification.failures.length} problem(s)`);
  if (interrupted) console.log(`Interrupted. Resume with: node scripts/media-import.mjs "${source}" --resume ${runId} (same options)`);
  console.log(`Report: ${path.relative(ROOT, reportFile)}`);
  if (counts.failed || verification?.failures.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(`Import error: ${redact(err?.message ?? err)}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
