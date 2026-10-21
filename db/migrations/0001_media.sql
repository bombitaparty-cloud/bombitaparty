-- 0001_media: media library for the date-wise gallery.
--
-- PostgreSQL is the source of truth for every asset: dates, file facts,
-- checksums, status, tags and the storage reference of each variant.
-- Binary payloads (optimized images, posters, videos) live in object storage
-- (Vercel Blob in production, a local folder in development); see
-- docs/MEDIA.md for why bytes are not stored in the database.
--
-- Only creates new objects. Never drops or rewrites existing tables.

-- Requires PostgreSQL 13+ (gen_random_uuid() is built in). Neon runs 15+.

CREATE TABLE media_assets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename text        NOT NULL CHECK (length(original_filename) BETWEEN 1 AND 255),
  title             text        CHECK (length(title) <= 200),
  caption           text        CHECK (length(caption) <= 500),
  description       text        CHECK (length(description) <= 4000),
  mime_type         text        NOT NULL,
  media_type        text        NOT NULL CHECK (media_type IN ('image', 'video')),
  -- Facts about the ORIGINAL file (not the web variants).
  file_size_bytes   bigint      NOT NULL CHECK (file_size_bytes > 0),
  width             integer     CHECK (width > 0),
  height            integer     CHECK (height > 0),
  duration_seconds  numeric(10, 3) CHECK (duration_seconds >= 0),
  checksum_sha256   char(64)    NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  -- Dates. gallery_date groups the gallery; it is the event night, else the
  -- reliable capture date, else a date an admin assigned. Never the upload time.
  captured_at       timestamptz,
  gallery_date      date        NOT NULL,
  date_source       text        NOT NULL CHECK (date_source IN ('event', 'capture', 'directory', 'manual')),
  event_slug        text        CHECK (length(event_slug) <= 120),
  category          text        CHECK (length(category) <= 60),
  display_order     integer     NOT NULL DEFAULT 0,
  -- Lifecycle.
  status            text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  visibility        text        NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'published')),
  published_at      timestamptz,
  processing_error  text,
  -- Where the original lives. Originals are kept out of the public CDN; the
  -- reference is informational (e.g. "import:<folder>/<file>").
  storage_backend   text        NOT NULL CHECK (storage_backend IN ('vercel-blob', 'local')),
  original_storage_key text,
  source_location   text        CHECK (length(source_location) <= 1000),
  uploaded_at       timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_checksum_unique UNIQUE (checksum_sha256),
  CONSTRAINT media_assets_published_needs_ready CHECK (visibility = 'draft' OR status = 'ready')
);

-- Web-ready renditions. One row per kind per asset.
CREATE TABLE media_variants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        uuid    NOT NULL REFERENCES media_assets (id) ON DELETE CASCADE,
  kind            text    NOT NULL CHECK (kind IN ('thumb', 'display', 'large', 'poster', 'video')),
  mime_type       text    NOT NULL,
  width           integer CHECK (width > 0),
  height          integer CHECK (height > 0),
  file_size_bytes bigint  NOT NULL CHECK (file_size_bytes > 0),
  storage_backend text    NOT NULL CHECK (storage_backend IN ('vercel-blob', 'local')),
  -- Object key / pathname inside the backend. Never returned by public APIs.
  storage_key     text    NOT NULL,
  -- Public CDN URL (blob) or NULL (local: streamed by /api/media).
  cdn_url         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_variants_one_per_kind UNIQUE (asset_id, kind)
);

CREATE TABLE media_tags (
  id   serial PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 40),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 40)
);

CREATE TABLE media_asset_tags (
  asset_id uuid    NOT NULL REFERENCES media_assets (id) ON DELETE CASCADE,
  tag_id   integer NOT NULL REFERENCES media_tags (id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, tag_id)
);

-- Resumable imports: one run per invocation, one item per source file.
CREATE TABLE media_import_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text        NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status      text        NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'interrupted'))
);

CREATE TABLE media_import_items (
  run_id          uuid NOT NULL REFERENCES media_import_runs (id) ON DELETE CASCADE,
  source_path     text NOT NULL,
  checksum_sha256 char(64),
  status          text NOT NULL CHECK (status IN ('imported', 'duplicate', 'invalid', 'failed')),
  asset_id        uuid REFERENCES media_assets (id) ON DELETE SET NULL,
  error           text,
  finished_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, source_path)
);

-- Public gallery listing: published + ready, newest night first, then order.
CREATE INDEX media_assets_gallery_idx
  ON media_assets (gallery_date DESC, display_order, id)
  WHERE visibility = 'published' AND status = 'ready';
CREATE INDEX media_assets_type_idx      ON media_assets (media_type, gallery_date DESC);
CREATE INDEX media_assets_category_idx  ON media_assets (category, gallery_date DESC) WHERE category IS NOT NULL;
CREATE INDEX media_assets_status_idx    ON media_assets (status, visibility);
CREATE INDEX media_assets_uploaded_idx  ON media_assets (uploaded_at DESC);
CREATE INDEX media_assets_event_idx     ON media_assets (event_slug) WHERE event_slug IS NOT NULL;
CREATE INDEX media_asset_tags_tag_idx   ON media_asset_tags (tag_id, asset_id);
CREATE INDEX media_import_items_sum_idx ON media_import_items (checksum_sha256);

-- What the public gallery may read. A read-only role can be limited to this
-- view (see docs/MEDIA.md → "Separate database roles").
CREATE VIEW media_public_assets AS
  SELECT id, original_filename, title, caption, description, mime_type, media_type,
         width, height, duration_seconds, captured_at, gallery_date, event_slug,
         category, display_order, published_at
    FROM media_assets
   WHERE visibility = 'published' AND status = 'ready';

CREATE VIEW media_public_variants AS
  SELECT v.asset_id, v.kind, v.mime_type, v.width, v.height, v.file_size_bytes, v.storage_backend, v.storage_key, v.cdn_url
    FROM media_variants v
    JOIN media_assets a ON a.id = v.asset_id
   WHERE a.visibility = 'published' AND a.status = 'ready';

CREATE VIEW media_public_asset_tags AS
  SELECT at.asset_id, t.slug, t.name
    FROM media_asset_tags at
    JOIN media_tags t ON t.id = at.tag_id
    JOIN media_assets a ON a.id = at.asset_id
   WHERE a.visibility = 'published' AND a.status = 'ready';

-- Keep updated_at honest on every metadata change.
CREATE FUNCTION media_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER media_assets_touch BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION media_touch_updated_at();
