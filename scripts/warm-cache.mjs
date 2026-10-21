#!/usr/bin/env node
/**
 * Warms the image cache after a deploy so real visitors never wait for an
 * image to be optimized the first time.
 *
 *   node scripts/warm-cache.mjs https://your-site.com
 *
 * Reads every page in the sitemap, collects each /_next/image variant the
 * HTML references (all srcset widths), and requests them all once.
 */
const base = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("Usage: node scripts/warm-cache.mjs https://your-site.com");
  process.exit(1);
}

const headers = { Accept: "image/webp,image/*,*/*", "User-Agent": "bombita-cache-warmer" };
const origin = new URL(base).origin;

async function text(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": headers["User-Agent"] } });
    return res.ok ? await res.text() : "";
  } catch {
    return ""; // flaky network: skip this page rather than abort the whole warm-up
  }
}

const sitemap = await text(`${base}/sitemap.xml`);
const pages = new Set(["/", ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)]);

const images = new Set();
for (const p of pages) {
  const html = await text(base + p);
  for (const m of html.matchAll(/\/_next\/image\?url=[^"\s,]+/g)) images.add(m[0].replace(/&amp;/g, "&"));
}
// Gallery renditions (served by /api/media): walk every page of the public API.
let cursor = null;
let mediaCount = 0;
do {
  const res = await fetch(`${base}/api/gallery?limit=60${cursor ? `&cursor=${cursor}` : ""}`).catch(() => null);
  if (!res?.ok) break;
  const page = await res.json();
  for (const it of page.items) for (const r of [it.thumb, it.display, it.large, it.poster]) if (r?.url?.startsWith("/")) { images.add(r.url); mediaCount++; }
  cursor = page.nextCursor;
} while (cursor);
console.log(`${pages.size} pages, ${images.size} image variants (${mediaCount} gallery renditions)`);

let done = 0;
let slow = 0;
const queue = [...images];
async function worker() {
  while (queue.length) {
    const path = queue.shift();
    const t = Date.now();
    try {
      const res = await fetch(origin + path, { headers });
      await res.arrayBuffer();
    } catch {
      /* keep going */
    }
    if (Date.now() - t > 800) slow++;
    if (++done % 50 === 0) console.log(`  ${done}/${images.size}`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`Warmed ${done} images (${slow} were cold).`);
