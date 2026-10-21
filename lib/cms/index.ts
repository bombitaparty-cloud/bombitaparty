import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { readEvents, seed } from "@/lib/store/events";
import { albums as localAlbums, photos as localPhotos, videos as localVideos } from "@/data/media";
import { isSanityEnabled, sanityQueries } from "./sanity";
import type { Album, BombitaEvent, Photo, StoredEvent, Video } from "./types";
import { createHash } from "crypto";
import { events as seedEvents } from "@/data/events";
import { eventEndMs } from "@/lib/utils";

/**
 * Single entry point for content. Components call these functions;
 * the source is decided here:
 *  - events → the admin dashboard store (lib/store/events), or Sanity if configured
 *  - photos / albums / videos → data/media.ts, or Sanity if configured
 */

/** Admin saves call updateTag(EVENTS_TAG) so the site refreshes immediately. */
export const EVENTS_TAG = "events";

/** Changes whenever data/events.ts changes, so a deploy never serves a stale cached seed. */
const SEED_VERSION = createHash("sha1").update(JSON.stringify(seedEvents)).digest("hex").slice(0, 10);

/** Stored events, cached across requests (5 min) and refreshed on every admin save. */
const cachedStoredEvents = unstable_cache(
  async () => {
    try {
      return await readEvents();
    } catch (err) {
      // Never take the public site down over storage: fall back to the seed events.
      console.error("[events] storage read failed, serving seed events", err);
      return seed();
    }
  },
  ["stored-events", SEED_VERSION],
  {
    tags: [EVENTS_TAG],
    revalidate: 300,
  },
);

/** Public = published and past its scheduled go-live time. */
const isLive = (e: StoredEvent, now = Date.now()) => e.published && (!e.publishAt || new Date(e.publishAt).getTime() <= now);

const isPast = (e: BombitaEvent, now = Date.now()) =>
  e.status === "past" || eventEndMs(e) < now;

export const getAllEvents = cache(async (): Promise<BombitaEvent[]> => {
  const list = isSanityEnabled ? await sanityQueries.events() : (await cachedStoredEvents()).filter((e) => isLive(e));
  return [...list].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
});

export async function getUpcomingEvents(): Promise<BombitaEvent[]> {
  return (await getAllEvents()).filter((e) => !isPast(e));
}

export async function getPastEvents(): Promise<BombitaEvent[]> {
  return (await getAllEvents()).filter((e) => isPast(e)).reverse();
}

/** The featured upcoming event, or the next one on the calendar. */
export async function getFeaturedEvent(): Promise<BombitaEvent | undefined> {
  const upcoming = await getUpcomingEvents();
  return upcoming.find((e) => e.featured) ?? upcoming[0];
}

export const getEventBySlug = cache(
  async (slug: string): Promise<BombitaEvent | undefined> => {
    if (isSanityEnabled) return (await sanityQueries.eventBySlug(slug)) ?? undefined;
    return (await getAllEvents()).find((e) => e.slug === slug);
  },
);

export async function getPhotos(): Promise<Photo[]> {
  return isSanityEnabled ? sanityQueries.photos() : localPhotos;
}

export async function getAlbums(): Promise<Album[]> {
  return isSanityEnabled ? sanityQueries.albums() : localAlbums;
}

export async function getVideos(): Promise<Video[]> {
  return isSanityEnabled ? sanityQueries.videos() : localVideos;
}

export { isPast };
