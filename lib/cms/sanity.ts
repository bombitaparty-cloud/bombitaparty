import "server-only";
import type { Album, BombitaEvent, Photo, Video } from "./types";

/**
 * Minimal Sanity adapter using the HTTP query API (no SDK needed).
 * Enabled automatically when NEXT_PUBLIC_SANITY_PROJECT_ID is set.
 * Schemas live in /sanity/schemaTypes — see README for setup.
 */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const apiVersion = "2025-01-01";
const token = process.env.SANITY_READ_TOKEN;

export const isSanityEnabled = Boolean(projectId);

/** Revalidate CMS content every 60s (ISR). Use a webhook + revalidateTag for instant updates. */
const REVALIDATE = 60;

export async function sanityFetch<T>(
  query: string,
  params: Record<string, string> = {},
): Promise<T> {
  const search = new URLSearchParams({ query });
  for (const [key, value] of Object.entries(params)) {
    search.set(`$${key}`, JSON.stringify(value));
  }
  const host = token ? "api.sanity.io" : "apicdn.sanity.io";
  const res = await fetch(
    `https://${projectId}.${host}/v${apiVersion}/data/query/${dataset}?${search}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      next: { revalidate: REVALIDATE, tags: ["sanity"] },
    },
  );
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const json = (await res.json()) as { result: T };
  return json.result;
}

const eventProjection = /* groq */ `{
  "slug": slug.current,
  title, subtitle, tagline, startsAt, endsAt,
  "venue": { "name": venue.name, "address": venue.address, "city": venue.city, "mapUrl": venue.mapUrl },
  "artists": coalesce(artists, []),
  "djs": coalesce(djs, []),
  description,
  "flyer": { "src": flyer.asset->url, "alt": coalesce(flyer.alt, title) },
  "gallery": coalesce(gallery[]{ "src": asset->url, "alt": coalesce(alt, "") }, []),
  "video": coalesce(videoUrl, video.asset->url),
  ticketUrl, tableUrl, status, featured, ageLimit, dressCode
}`;

export const sanityQueries = {
  events: () =>
    sanityFetch<BombitaEvent[]>(
      `*[_type == "event" && defined(slug.current)] | order(startsAt asc) ${eventProjection}`,
    ),
  eventBySlug: (slug: string) =>
    sanityFetch<BombitaEvent | null>(
      `*[_type == "event" && slug.current == $slug][0] ${eventProjection}`,
      { slug },
    ),
  photos: () =>
    sanityFetch<Photo[]>(
      `*[_type == "photo"] | order(_createdAt desc) { "id": _id, "src": image.asset->url, "alt": coalesce(alt, ""), shape, album }`,
    ),
  albums: () =>
    sanityFetch<Album[]>(
      `*[_type == "album"] | order(date desc) { "slug": slug.current, title, date, venue, category, "cover": cover.asset->url, "photos": photos[].asset->url }`,
    ),
  videos: () =>
    sanityFetch<Video[]>(
      `*[_type == "video"] | order(order asc) { "id": _id, title, subtitle, "sources": { "720": coalesce(url, file.asset->url), "1080": url1080, "2160": url4k }, "preview": previewUrl, "poster": poster.asset->url, duration, featured }`,
    ),
};
