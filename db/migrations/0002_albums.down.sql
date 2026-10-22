-- Rollback for 0002_albums. NOT run automatically. Removes album titles/covers
-- only; photos are untouched.
--   node scripts/db-migrate.mjs --down 0002_albums --yes-i-have-a-backup

DROP VIEW IF EXISTS media_public_albums;
DROP TABLE IF EXISTS media_albums;
