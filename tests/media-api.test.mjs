/**
 * End-to-end tests for the media backend, run against a live server.
 *
 *   TEST_BASE_URL=http://localhost:3100 node --test tests/media-api.test.mjs
 *
 * Needs a server started with DATABASE_URL pointing at a TEST database
 * (scripts/dev-db.mjs) and local storage (BLOB_* unset). Never point this at
 * production: it uploads, edits and deletes assets.
 * The admin session cookie is signed locally from ADMIN_PASSWORD/ADMIN_SECRET in .env.local.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3100";
if (/bombita-topaz|vercel\.app|bombita\.nyc/.test(BASE)) throw new Error("Refusing to run destructive tests against production.");

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const secret = env.ADMIN_SECRET || `bombita:${env.ADMIN_PASSWORD ?? ""}`;
const exp = Date.now() + 3600e3;
const ADMIN = `bombita_admin=${exp}.${crypto.createHmac("sha256", secret).update(`admin.${exp}`).digest("base64url")}`;
const adminHeaders = { cookie: ADMIN, "x-bombita-admin": "1" };

const get = (p, init) => fetch(BASE + p, { redirect: "manual", ...init });
const json = async (p, init) => {
  const r = await get(p, init);
  return { status: r.status, headers: r.headers, body: await r.json().catch(() => null) };
};

async function allPages(qs = "") {
  const items = [];
  let cursor = null;
  let pages = 0;
  do {
    const r = await json(`/api/gallery?limit=25${qs}${cursor ? `&cursor=${cursor}` : ""}`);
    assert.equal(r.status, 200);
    items.push(...r.body.items);
    cursor = r.body.nextCursor;
    pages++;
  } while (cursor && pages < 100);
  return { items, pages };
}

test("public listing paginates every published item exactly once, newest date first", async () => {
  const { items, pages } = await allPages();
  const facets = (await json("/api/gallery/dates")).body;
  assert.ok(items.length > 0, "expected published items");
  assert.equal(items.length, facets.total, "pages add up to the published total");
  assert.equal(new Set(items.map((i) => i.id)).size, items.length, "no duplicates across pages");
  assert.ok(pages > 1, "exercises more than one page");
  for (let i = 1; i < items.length; i++) assert.ok(items[i - 1].date >= items[i].date, "sorted by date desc");
  for (const d of facets.dates) assert.equal(items.filter((i) => i.date === d.date).length, d.count, `count for ${d.date}`);
  for (let i = 1; i < facets.dates.length; i++) assert.ok(facets.dates[i - 1].date > facets.dates[i].date);
});

test("listing never leaks storage paths, checksums or bytes", async () => {
  const r = await get("/api/gallery?limit=60");
  const text = await r.text();
  for (const bad of ["storage_key", "storageKey", "checksum", "original_storage", "source_location", ".data", "media-store", "C:\\\\", "postgres"]) {
    assert.ok(!text.includes(bad), `response contains ${bad}`);
  }
  assert.ok(text.length < 60 * 1500, `metadata page stays small (${text.length} bytes for 60 items)`);
});

test("filters: date, type, category, tag", async () => {
  const day = (await json("/api/gallery?date=2026-09-12&limit=60")).body;
  assert.ok(day.items.length > 0 && day.items.every((i) => i.date === "2026-09-12"));
  const vids = (await json("/api/gallery?type=video")).body;
  assert.ok(vids.items.length >= 1 && vids.items.every((i) => i.type === "video" && i.video?.url && i.poster?.url));
  const cat = (await json("/api/gallery?category=Day%20Parties")).body;
  assert.ok(cat.items.length >= 1 && cat.items.every((i) => i.category === "Day Parties"));
  const tag = (await json("/api/gallery?tag=rooftop")).body;
  assert.ok(tag.items.length >= 1 && tag.items.every((i) => i.tags.includes("rooftop")));
  const range = (await json("/api/gallery?from=2026-09-13&to=2026-12-31&limit=60")).body;
  assert.ok(range.items.every((i) => i.date >= "2026-09-13"));
});

test("validation errors return 400 with a JSON error", async () => {
  for (const q of ["date=2026-13-40", "type=pdf", "limit=500", "cursor=garbage", "from=2026-10-01&to=2026-09-01"]) {
    const r = await json(`/api/gallery?${q}`);
    assert.equal(r.status, 400, q);
    assert.ok(r.body?.error?.message, q);
  }
});

test("ETag + If-None-Match → 304, cache headers set", async () => {
  const a = await get("/api/gallery?limit=5");
  const etag = a.headers.get("etag");
  assert.ok(etag);
  assert.match(a.headers.get("cache-control"), /max-age=0, must-revalidate/, "browsers never serve a stale listing");
  assert.match(a.headers.get("vercel-cdn-cache-control"), /stale-while-revalidate/);
  const b = await get("/api/gallery?limit=5", { headers: { "If-None-Match": etag } });
  assert.equal(b.status, 304);
});

test("single item: published 200, unknown/malformed 404", async () => {
  const { body } = await json("/api/gallery?limit=1");
  const one = await json(`/api/gallery/${body.items[0].id}`);
  assert.equal(one.status, 200);
  assert.equal(one.body.id, body.items[0].id);
  assert.equal((await json(`/api/gallery/${crypto.randomUUID()}`)).status, 404);
  assert.equal((await json("/api/gallery/not-a-uuid")).status, 404);
});

test("delivery: thumbnails stream with immutable caching; videos honour Range", async () => {
  const { body } = await json("/api/gallery?type=video");
  const v = body.items[0];
  const thumb = await get(v.thumb.url);
  assert.equal(thumb.status, 200);
  assert.equal(thumb.headers.get("content-type"), "image/webp");
  assert.match(thumb.headers.get("cache-control"), /immutable/);
  const full = await get(v.video.url, { method: "HEAD" });
  const size = Number(full.headers.get("content-length"));
  assert.ok(size > 1000);
  const part = await get(v.video.url, { headers: { Range: "bytes=100-199" } });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("content-range"), `bytes 100-199/${size}`);
  assert.equal((await part.arrayBuffer()).byteLength, 100);
  const tail = await get(v.video.url, { headers: { Range: "bytes=-50" } });
  assert.equal(tail.status, 206);
  assert.equal((await tail.arrayBuffer()).byteLength, 50);
  const bad = await get(v.video.url, { headers: { Range: `bytes=${size + 10}-` } });
  assert.equal(bad.status, 416);
  const etag = thumb.headers.get("etag");
  assert.equal((await get(v.thumb.url, { headers: { "If-None-Match": etag } })).status, 304);
});

test("unauthenticated users cannot read or change admin data", async () => {
  const id = crypto.randomUUID();
  const calls = [
    ["GET", "/api/admin/media"],
    ["GET", "/api/admin/media/stats"],
    ["POST", "/api/admin/media/check", JSON.stringify({ checksums: [] })],
    ["PATCH", "/api/admin/media", JSON.stringify({ ids: [id], patch: { visibility: "published" } })],
    ["DELETE", "/api/admin/media", JSON.stringify({ ids: [id] })],
    ["POST", "/api/admin/media", new FormData()],
  ];
  for (const [method, p, body] of calls) {
    assert.equal((await get(p, { method, body, headers: { "x-bombita-admin": "1" } })).status, 401, `${method} ${p} without session`);
  }
  // Session cookie but no CSRF header → 403 on writes.
  assert.equal((await get("/api/admin/media", { method: "DELETE", body: JSON.stringify({ ids: [id] }), headers: { cookie: ADMIN } })).status, 403);
  // Forged cookie → 401.
  assert.equal((await get("/api/admin/media", { headers: { cookie: `bombita_admin=${exp}.forged`, "x-bombita-admin": "1" } })).status, 401);
});

test("drafts are hidden from the public and visible to admins", async () => {
  const drafts = (await json("/api/admin/media?visibility=draft&status=ready&pageSize=5", { headers: adminHeaders })).body;
  assert.ok(drafts.items.length > 0, "fixture drafts exist");
  const d = drafts.items[0];
  assert.equal((await json(`/api/gallery/${d.id}`)).status, 404);
  assert.equal((await get(`/api/media/${d.id}/thumb`)).status, 404);
  const asAdmin = await get(`/api/media/${d.id}/thumb`, { headers: { cookie: ADMIN } });
  assert.equal(asAdmin.status, 200);
  assert.match(asAdmin.headers.get("cache-control"), /no-store/);
});

test("admin upload → duplicate → edit → publish → unpublish → delete", async () => {
  const sharp = (await import("sharp")).default;
  const img = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: { r: 200, g: 30, b: 60 } } })
    .composite([{ input: Buffer.from(`<svg width="1600" height="1000"><text x="80" y="500" font-size="200" fill="white">${crypto.randomUUID().slice(0, 8)}</text></svg>`) }])
    .jpeg()
    .toBuffer();
  const checksum = crypto.createHash("sha256").update(img).digest("hex");
  const form = () => {
    const f = new FormData();
    f.append("file", new Blob([img], { type: "image/jpeg" }), "test-upload.jpg");
    f.append("meta", JSON.stringify({ originalFilename: "../../etc/test-upload.jpg", originalMime: "image/jpeg", originalSize: img.length, checksum, galleryDate: "2026-10-03", dateSource: "manual", tags: ["test tag"] }));
    return f;
  };
  const created = await json("/api/admin/media", { method: "POST", body: form(), headers: adminHeaders });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.id;

  const dup = await json("/api/admin/media", { method: "POST", body: form(), headers: adminHeaders });
  assert.equal(dup.status, 200);
  assert.equal(dup.body.status, "duplicate");
  assert.equal(dup.body.id, id);

  const check = await json("/api/admin/media/check", { method: "POST", body: JSON.stringify({ checksums: [checksum] }), headers: adminHeaders });
  assert.equal(check.body.existing[0].id, id);

  const listed = (await json(`/api/admin/media?q=test-upload&pageSize=5`, { headers: adminHeaders })).body.items.find((i) => i.id === id);
  assert.ok(listed, "admin list finds the upload");
  assert.equal(listed.originalFilename, "test-upload.jpg", "path components stripped from filename");
  assert.equal(listed.visibility, "draft");
  assert.equal(listed.status, "ready");
  assert.deepEqual(listed.tags.map((t) => t.slug), ["test-tag"]);
  assert.equal((await json(`/api/gallery/${id}`)).status, 404, "draft not public");

  const edit = await json("/api/admin/media", { method: "PATCH", body: JSON.stringify({ ids: [id], patch: { title: "Test title", galleryDate: "2026-10-04", visibility: "published", addTags: ["Encore"] } }), headers: adminHeaders });
  assert.deepEqual(edit.body.updated, [id]);
  const pub = await json(`/api/gallery/${id}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.body.title, "Test title");
  assert.equal(pub.body.date, "2026-10-04");
  assert.deepEqual(pub.body.tags.sort(), ["encore", "test-tag"]);
  const thumbUrl = pub.body.thumb.url;
  assert.equal((await get(thumbUrl)).status, 200);

  await json("/api/admin/media", { method: "PATCH", body: JSON.stringify({ ids: [id], patch: { visibility: "draft" } }), headers: adminHeaders });
  assert.equal((await json(`/api/gallery/${id}`)).status, 404, "unpublished again");

  const del = await json("/api/admin/media", { method: "DELETE", body: JSON.stringify({ ids: [id] }), headers: adminHeaders });
  assert.deepEqual(del.body.deleted, [id]);
  assert.equal(del.body.orphanedFiles, 0);
  assert.equal((await get(thumbUrl, { headers: { cookie: ADMIN } })).status, 404, "files gone after delete");
});

test("upload validation: wrong type, bad signature, bad meta, oversize", async () => {
  const fake = new FormData();
  fake.append("file", new Blob([Buffer.from("definitely not an image")], { type: "image/jpeg" }), "x.jpg");
  fake.append("meta", JSON.stringify({ originalFilename: "x.jpg", originalMime: "image/jpeg", originalSize: 10, checksum: "a".repeat(64), galleryDate: "2026-10-01" }));
  const r1 = await json("/api/admin/media", { method: "POST", body: fake, headers: adminHeaders });
  assert.equal(r1.status, 400);

  const badMeta = new FormData();
  badMeta.append("file", new Blob([Buffer.alloc(10)]), "x.jpg");
  badMeta.append("meta", JSON.stringify({ originalFilename: "x.jpg", originalMime: "application/x-msdownload", originalSize: 10, checksum: "a".repeat(64), galleryDate: "2026-10-01" }));
  assert.equal((await json("/api/admin/media", { method: "POST", body: badMeta, headers: adminHeaders })).status, 400);

  const badDate = new FormData();
  badDate.append("file", new Blob([Buffer.alloc(10)]), "x.jpg");
  badDate.append("meta", JSON.stringify({ originalFilename: "x.jpg", originalMime: "image/jpeg", originalSize: 10, checksum: "a".repeat(64), galleryDate: "yesterday" }));
  assert.equal((await json("/api/admin/media", { method: "POST", body: badDate, headers: adminHeaders })).status, 400);

  const big = new FormData();
  big.append("file", new Blob([Buffer.alloc(5 * 1024 * 1024)]), "big.jpg");
  big.append("meta", "{}");
  assert.equal((await json("/api/admin/media", { method: "POST", body: big, headers: adminHeaders })).status, 413);

  const noIds = await json("/api/admin/media", { method: "PATCH", body: JSON.stringify({ ids: ["1; DROP TABLE media_assets"], patch: { title: "x" } }), headers: adminHeaders });
  assert.equal(noIds.status, 400, "non-UUID ids rejected");
});

test("publishing a failed asset is refused (only ready assets can be public)", async () => {
  const failed = (await json("/api/admin/media?status=failed&pageSize=5", { headers: adminHeaders })).body.items;
  assert.ok(failed.length > 0, "fixture failed asset exists");
  const r = await json("/api/admin/media", { method: "PATCH", body: JSON.stringify({ ids: [failed[0].id], patch: { visibility: "published" } }), headers: adminHeaders });
  assert.deepEqual(r.body.updated, []);
  assert.deepEqual(r.body.skipped, [failed[0].id]);
});

test("stats add up", async () => {
  const s = (await json("/api/admin/media/stats", { headers: adminHeaders })).body;
  assert.equal(s.published + s.drafts, s.total);
  assert.equal(s.images + s.videos, s.total);
  assert.equal(Object.values(s.byStatus).reduce((a, b) => a + b, 0), s.total);
  assert.ok(s.webBytes > 0 && s.originalBytes > s.webBytes);
});

test("gallery page: gate for visitors, date-grouped gallery for members", async () => {
  const visitor = await (await get("/photos")).text();
  assert.match(visitor, /Unlock the/);
  const member = await (await get("/photos", { headers: { cookie: "bombita_member=1" } })).text();
  assert.match(member, /Saturday, September 12, 2026/);
  assert.match(member, /photos?/);
  const filtered = await (await get("/photos?type=video", { headers: { cookie: "bombita_member=1" } })).text();
  assert.match(filtered, /Sunday, September 20, 2026/);
  assert.doesNotMatch(filtered, /Saturday, September 12, 2026<\/h3>/);
});

