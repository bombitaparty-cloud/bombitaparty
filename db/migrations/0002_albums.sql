-- 0002_albums: optional album details per gallery night.
--
-- Photos are already grouped by media_assets.gallery_date; this table lets
-- the admin name a night (title, venue, category) and choose its cover photo
-- (the album thumbnail). A night without a row still shows, using the
-- site's event on that date or its category. Additive only.

CREATE TABLE media_albums (
  album_date     date PRIMARY KEY,
  title          text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  venue          text CHECK (length(venue) <= 120),
  city           text NOT NULL DEFAULT 'New York' CHECK (length(city) BETWEEN 1 AND 60),
  category       text CHECK (length(category) <= 60),
  description    text CHECK (length(description) <= 2000),
  cover_asset_id uuid REFERENCES media_assets (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER media_albums_touch BEFORE UPDATE ON media_albums
  FOR EACH ROW EXECUTE FUNCTION media_touch_updated_at();

-- Public album details (a read-only role can be limited to this view too).
-- The cover only counts when that photo is itself published and ready.
CREATE VIEW media_public_albums AS
  SELECT al.album_date, al.title, al.venue, al.city, al.category, al.description,
         CASE WHEN a.id IS NOT NULL THEN al.cover_asset_id END AS cover_asset_id
    FROM media_albums al
    LEFT JOIN media_assets a ON a.id = al.cover_asset_id AND a.visibility = 'published' AND a.status = 'ready';
