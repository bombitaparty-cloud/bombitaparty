-- Rollback for 0001_media. NOT run automatically.
--
-- ⚠ Destroys every media record (the binaries in object storage stay and
-- must be removed separately). Only run with explicit sign-off, after a
-- backup or Neon branch snapshot (see docs/MEDIA.md → "Rollback").
--
--   node scripts/db-migrate.mjs --down 0001_media --yes-i-have-a-backup

DROP VIEW IF EXISTS media_public_asset_tags;
DROP VIEW IF EXISTS media_public_variants;
DROP VIEW IF EXISTS media_public_assets;
DROP TABLE IF EXISTS media_import_items;
DROP TABLE IF EXISTS media_import_runs;
DROP TABLE IF EXISTS media_asset_tags;
DROP TABLE IF EXISTS media_tags;
DROP TABLE IF EXISTS media_variants;
DROP TABLE IF EXISTS media_assets;
DROP FUNCTION IF EXISTS media_touch_updated_at();
