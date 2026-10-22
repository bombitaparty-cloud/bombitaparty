# Media library & date-wise gallery

PostgreSQL (Neon) is the source of truth for every gallery photo and video:
dates, file facts, SHA-256 checksums, status, publication, tags and the
storage reference of each rendition. The `/photos` gallery and the admin
**Media** tab read and write only through the backend API below — no gallery
URL is hard-coded in the frontend.

---

## 1. Storage decision (why bytes are not in PostgreSQL)

Measured on the first real batch ("BOMBITA FINAL PICS", 148 Sony FX3 JPEGs):

| | Size |
|---|---|
| Camera originals | **1,165 MB** (4.6–12.3 MB each, 2832×4240 px) |
| Web renditions (thumb 480 + display 1280 + large 2048, WebP) | **≈ 101 MB** (0.68 MB / photo, measured on a 30-photo sample) |
| Thumbnail · display · large | 31 KB · 172 KB · 463 KB average |

| Option | Verdict |
|---|---|
| **A. Bytes in PostgreSQL (BYTEA / large objects)** | Neon Free includes 0.5 GB of storage, so the originals alone don't fit. Every view would go through a Vercel function, which caps request and response bodies at about 4.5 MB, and through the database connection, with no CDN in front. Range requests for video would have to be hand-built over chunked rows. That is slower and costs more per GB. **Rejected.** |
| **B. Metadata in PostgreSQL + files in object storage** | Files are served from a CDN with HTTP Range support for video, and are immutable so they can be cached forever. The database holds only small rows (about 2 KB per asset). **Chosen.** |

**Object store: Vercel Blob**, already connected to the project and used by the
admin. Plan limits matter: **Hobby Blob = 1 GB storage + 10 GB transfer per
month, and exceeding them locks Blob for 30 days** (that would also break event
saving and signups). So:

- **This project's Blob store is private-access.** Renditions are stored as private objects and served by `/api/media/:id/:kind`, which streams them from Blob, Range requests included. Published files carry `Cache-Control` and `Vercel-CDN-Cache-Control: public, max-age=31536000, immutable`, so after the first request Vercel's CDN serves them without calling the function. Drafts are truly private: the function only delivers them to admins. `MEDIA_BLOB_ACCESS=public|private` overrides the mode; if unset, the mode is detected on the first write.
- Only optimized web renditions go to Blob, about 0.68 MB per photo, which leaves room for about 1,300 photos inside a 900 MB budget. The admin shows a storage bar.
- **Originals are not uploaded.** They stay where they came from (the import folder or the photographer's archive). Each original's SHA-256 checksum, size, dimensions and source location are recorded in `media_assets`, so an original can always be matched back. `original_storage_key` is reserved for when an archive store is added.
- **Neon Object Storage** is listed on Neon's pricing page at $0.023/GB-month, 5 GB free per project, but third-party sources (July 2026) describe it as beta and not feature-complete, so the published rates may still change. It's a good future home for originals once it is generally available. The `storage_backend` column already supports adding a backend.
- Upgrading Vercel to Pro gives 100 GB of Blob transfer and pay-as-you-go storage. It's also required for commercial sites under Vercel's terms.

## 2. Schema (`db/migrations/0001_media.sql`)

- `media_assets`: one row per photo or video. It holds:
  - the original's filename, MIME type, size, dimensions, duration and checksum
  - `gallery_date`, `date_source`, `captured_at` and `uploaded_at`, which are kept separate
  - title, caption, description, category and `event_slug`
  - `display_order`, `status` and `visibility`
  - `storage_backend` and `source_location`

  Constraints: the checksum is unique, so the same file can't be imported twice, and only `ready` assets can be `published`.
- `media_variants`: one row per rendition (`thumb`, `display`, `large`, `poster`, `video`), with its storage key, CDN URL, size and dimensions. Rows are deleted together with their asset (`ON DELETE CASCADE`).
- `media_tags` and `media_asset_tags`: normalized tags.
- `media_import_runs` and `media_import_items`: the resumable import log, with the outcome of each file.
- Views `media_public_assets`, `media_public_variants` and `media_public_asset_tags`: only rows that are published and ready. The public API reads only these.
- Indexes:
  - a partial gallery index on `(gallery_date DESC, display_order, id)` for published, ready assets; the query plan confirms an index-only scan in gallery order
  - indexes on type, category, status, upload time, event and tag

### Date rules (never invented)

`gallery_date` comes from the first rule that applies:

1. **Event date** — the uploader sets the event night for the whole batch.
2. **EXIF capture date** — the calendar date exactly as the camera wrote it. `captured_at` stores the instant when the camera recorded a UTC offset.
3. **A `YYYY-MM-DD` or `YYYY_MM_DD` folder name**.
4. **A fallback date** the admin types in.

Files with none of these are refused and listed in the import report. Admins can correct the date later, which sets `date_source = 'manual'`.

## 3. Setup

1. **Rotate the Neon password.** A connection string was shared in chat, so treat that password as compromised. In the Neon Console, open your project → Roles → `neondb_owner` → Reset password.
2. **Add the new pooled connection string, server-only:**
   - Locally, in `.env.local`: `DATABASE_URL=postgresql://…-pooler…/neondb?sslmode=require`
   - On Vercel: `npx vercel env add DATABASE_URL production`, then paste the value. Repeat for `preview` if you use preview deployments.
3. **Migrate:**
   ```bash
   npm run db:status      # inspects the existing schema, changes nothing
   npm run db:migrate     # applies pending migrations in transactions
   ```
   The runner lists the existing tables first and refuses to run if a table it would create already exists.
4. **Import the first batch** (section 4), review it in **Admin → Media**, then publish.
5. Deploy, then warm caches: `npm run cache:warm -- https://your-domain`.

### Separate database roles (recommended)

Create a read-only role in Neon (Console → Roles → New role, e.g.
`gallery_reader`), then run this as the owner:

```sql
GRANT USAGE ON SCHEMA public TO gallery_reader;
GRANT SELECT ON media_public_assets, media_public_variants, media_public_asset_tags TO gallery_reader;
```

Set its pooled connection string as `DATABASE_URL_READONLY`. Public gallery
queries then cannot see drafts or write anything, even if application code
had a bug. `DATABASE_URL` stays the admin/write role. Migrations can use an
owner role via `DATABASE_MIGRATION_URL`.

## 4. Adding date-wise media

### From a folder (large batches)

```bash
# Dry run: shows dates, duplicates and invalid files; writes nothing
npm run media:import -- "media-import/2026-10-31-haunted-hotel" --dry-run

# Import as drafts (review in Admin → Media, then publish)
npm run media:import -- "media-import/2026-10-31-haunted-hotel" --event the-haunted-hotel-halloween-2026 --category "Bombita Nights" --tags "radio hotel,tipico"

# Options
#   --event-date 2026-10-31   use one event night for the whole folder
#   --date 2026-10-31         fallback for files with no EXIF/folder date
#   --publish                 publish immediately
#   --concurrency 3           parallel files (1–8)
#   --storage local           write to .data/media instead of Blob (testing)
```

How it behaves:
- **Discovery:** recursive. Supported types are JPEG, PNG, WebP, AVIF, GIF, MP4, MOV and WebM; HEIC is refused with a hint to export as JPEG. Types are checked by file signature, not extension.
- **Duplicates:** detected by SHA-256, across runs and within a run.
- **Videos:** need ffmpeg/ffprobe. Each gets a 1280 px H.264 web version (CRF 26, faststart) plus poster and thumbnail renditions.
- **Progress:** printed per file. A JSON report goes to `media-import/reports/`.
- **Verification:** every rendition is checked after upload (HEAD + size).
- **Crashes and interruptions:** a crash or Ctrl+C leaves a resumable run. Re-run with `--resume <run-id>` and the same options; finished files are skipped, and half-finished ones are cleaned up and redone.
- **Originals:** never modified or deleted. Delete them yourself only after the report shows them imported and verified.
- **Re-checking storage:** run `npm run media:verify` at any time.

**WeTransfer / Google Photos links:** download the archive, unzip it into
`media-import/<date>-<name>/` (the folder is ignored by git and Vercel), then
import. Google Photos shared albums can't be scripted; use the album's
"Download all" while signed in.

### Albums (one per night)

**Admin → Media → Albums** lists every night that has photos or saved album details. **New album** sets the night's date, title, venue, city and category. **Upload** points the uploader at that night. **Photos** filters the library to it. To choose the album thumbnail, open any photo in the library and click **Use as album cover**; without a chosen cover, the night's first photo is used. Albums are stored in `media_albums` (migration `0002_albums`). An album stays hidden on `/photos` until it has published photos. Removing an album's details never deletes its photos.

### From the admin (smaller batches, any device)

**Admin → Media → Upload**:
- **Adding files:** drag and drop, choose files, or choose a folder (folder names with dates are used).
- **Images:** resized in the browser to ≤ 2560 px, so they fit the 4 MB request limit; the server re-encodes them to WebP. EXIF dates are read before resizing.
- **Videos (≤ 200 MB):** go straight to Blob, and the browser captures the poster frame.
- **Feedback:** each file shows its status (reading, duplicate, needs a date, uploading, done, failed) and its progress.

## 5. API

All responses are JSON unless noted. Errors use `{ "error": { "code", "message", "details?" } }` with the matching HTTP status: 400 validation, 401 not signed in, 403 missing admin header, 404, 413 too large, 429 rate limited, 503 database not configured.

### Public

| Method | Path | Notes |
|---|---|---|
| GET | `/api/gallery` | `?limit=1–60&cursor=&date=YYYY-MM-DD&from=&to=&type=image\|video&category=&tag=`. Returns `{ items, nextCursor }`, newest date first, keyset-paginated. Items carry metadata and rendition URLs only. |
| GET | `/api/gallery/dates` | `{ dates:[{date,count,images,videos,cover}], categories, tags, total }`. Accepts the same type, category and tag filters. |
| GET | `/api/gallery/:id` | One published asset; 404 for drafts or unknown ids. |
| GET/HEAD | `/api/media/:id/:kind` | Stable delivery endpoint for `kind` = thumb, display, large, poster or video. Published Blob files get a 302 to the immutable CDN URL. Local files stream with Range, 206 and 416 support. Drafts are served only to admins, with `no-store`. |

Caching: the listing sends an ETag (304 on repeat), with `Cache-Control: max-age=0, must-revalidate` for browsers and `Vercel-CDN-Cache-Control: max-age=60, stale-while-revalidate=600`. Admin changes appear within about a minute. Rate limit: 240 requests per minute per IP, per instance.

### Admin

Every admin request needs a valid admin session cookie, and every write also needs the header `x-bombita-admin: 1`. Cross-site forms can't send that header (CSRF protection).

| Method | Path | Body / query |
|---|---|---|
| GET | `/api/admin/media` | `?q&status&visibility&type&date&category&sort=date_desc\|date_asc\|uploaded_desc\|name_asc&page&pageSize` |
| POST | `/api/admin/media` | multipart: `file` (an image ≤ 4 MB, or a video's poster) plus `meta` JSON: `originalFilename, originalMime, originalSize, checksum, galleryDate, dateSource, capturedAt?, originalWidth?, originalHeight?, durationSeconds?, title?, caption?, category?, eventSlug?, tags?, publish?, videoUrl?`. Returns 201 `{status:"imported",id}`, or 200 `{status:"duplicate",id}`. |
| PATCH | `/api/admin/media` | `{ ids: uuid[≤500], patch: { title, caption, description, category, eventSlug, galleryDate, displayOrder, visibility, addTags, removeTags } }`. Runs as one transaction. Returns `{updated, skipped}`; only `ready` assets can be published. |
| DELETE | `/api/admin/media` | `{ ids }`. Deletes the rows in a transaction, then the stored files. Returns `{deleted, filesRemoved, orphanedFiles}`; orphans are logged. |
| POST | `/api/admin/media/check` | `{ checksums: sha256[] }`. Returns which files already exist. |
| GET | `/api/admin/media/stats` | Counts by status, visibility and type; original, web and Blob bytes; the storage budget. |

## 6. Security notes

- **Credentials:** `DATABASE_URL` is only read by `lib/db` (`server-only`) and the CLI scripts. It is validated (postgres scheme, `sslmode=require` for Neon) and never logged. Logs redact connection strings, `npg_` passwords and Blob tokens. A scan of `.next/static` found no secrets.
- **Queries:** all SQL is parameterized.
- **Pool:** at most 3 connections per server instance by default, through Neon's PgBouncer pooler.
- **Uploads:**
  - The file signature is checked, so the extension is never trusted.
  - Images are decoded with a pixel limit and re-encoded, which strips EXIF and GPS data from published renditions.
  - Filenames are sanitized.
  - Size limits are enforced.
  - Video uploads must be in our Blob store under `media/uploads/` and pass a signature check.
- **What public responses never contain:** storage keys, checksums, source paths, filesystem paths or bytes.
- **Drafts:** hidden by the public views. With the private Blob store, draft files are only delivered to signed-in admins. On a public store, their CDN URLs are random and unguessable but not encrypted.

## 7. Backup, recovery & rollback

- **Database:** Neon keeps point-in-time restore history (the window depends on your plan). Before big changes, create a branch in Neon Console → Branches → Create branch from main; it's instant and copy-on-write. To restore, use Neon Console → Restore.
- **Files:** renditions can always be rebuilt from the originals. Re-import the original folder after deleting the affected assets, and the checksums will match. **Keep the original archive** (e.g. the WeTransfer zip, or the photographer's drive) as the master copy.
- **Rollback of 0001:** `node scripts/db-migrate.mjs --down 0001_media --yes-i-have-a-backup`. This drops the media tables only; Blob files stay and can be deleted from the Vercel Storage tab.

## 8. Tests & measurements

```bash
npm run db:dev                    # throwaway PGlite Postgres on :54329 (never Neon)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/postgres npm run db:migrate
DATABASE_URL=… npm run media:import -- <folder> --storage local --publish
DATABASE_URL=… BLOB_STORE_ID= BLOB_READ_WRITE_TOKEN= npx next start -p 3100
TEST_BASE_URL=http://localhost:3100 npm run test:media     # refuses to run against production
```

`tests/media-api.test.mjs` has 14 end-to-end tests:
- pagination, filters, validation, ETag
- Range and 206/416 responses, and hiding drafts
- admin authorization (401 and 403), and the full upload → duplicate → edit → publish → unpublish → delete flow
- upload validation, refusing to publish failed assets, and stats
- the gallery page rendering

Measured locally on 2026-10-22 (PGlite + local storage, 163 assets; Neon adds its network round trip):

| Budget | Target | Measured |
|---|---|---|
| Gallery API, first page (30) | p95 < 300 ms | p50 12 ms · p95 17 ms |
| Next page (cursor) | p95 < 300 ms | p50 14 ms · p95 18 ms |
| Date summaries | p95 < 300 ms | p50 11 ms · p95 15 ms |
| Metadata per 30 items | < 30 KB gzip | 14.8 KB raw · 1.6 KB gzip |
| Thumbnail | < 50 KB | 31–33 KB average (480 px WebP) |
| Lightbox image (display) | < 300 KB | 172–180 KB average (1280 px WebP) |
| Mobile first load: gallery images | < 600 KB, 0 originals | 6 thumbnails = 191 KB, 0 originals |
| Layout shift | CLS < 0.1 | 0.000 |
| Import throughput | — | 148 photos / 1.17 GB in 191 s (concurrency 3) |

Paint metrics (LCP) on the live site will be measured after the production deploy.
