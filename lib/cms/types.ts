/**
 * Shared content types. Local data files (data/*.ts) and the Sanity adapter
 * (lib/cms/sanity.ts) both return these shapes, so components never care
 * where content comes from.
 */

export interface Venue {
  name: string;
  address: string;
  city: string;
  /** Optional Google Maps link. */
  mapUrl?: string;
}

export type EventStatus =
  | "on-sale"
  | "few-left"
  | "sold-out"
  | "coming-soon"
  | "past";

export interface MediaImage {
  src: string;
  alt: string;
}

export interface BombitaEvent {
  slug: string;
  /** Event name, e.g. "El Rubio Acordeón". */
  title: string;
  /** Short line under the title, e.g. "En Vivo". */
  subtitle?: string;
  /** One-line hook for cards, e.g. "Cerrando el verano en grande". */
  tagline?: string;
  /** ISO 8601 with NYC offset, e.g. "2026-10-10T15:00:00-04:00". */
  startsAt: string;
  endsAt?: string;
  venue: Venue;
  /** Headliners / live artists. */
  artists: string[];
  /** DJs on the lineup. */
  djs: string[];
  description: string;
  flyer: MediaImage;
  gallery: MediaImage[];
  /** Optional MP4 / video URL for the event page. */
  video?: string;
  /** Falls back to site.ticketUrl when empty. */
  ticketUrl?: string;
  /** Falls back to site.tableUrl when empty. */
  tableUrl?: string;
  status: EventStatus;
  featured?: boolean;
  /** Minimum age, e.g. 21. */
  ageLimit?: number;
  dressCode?: string;
}

export interface Photo extends MediaImage {
  id: string;
  /** Layout hint for editorial grids. */
  shape?: "portrait" | "landscape" | "square" | "tall";
  album?: string;
}

/** One clip in several renditions, keyed by height ("720" | "1080" | "2160"). */
export type VideoSources = Partial<Record<"720" | "1080" | "2160", string>>;

export interface Video {
  id: string;
  title: string;
  subtitle?: string;
  sources: VideoSources;
  preview?: string;
  poster: string;
  duration?: string;
  featured?: boolean;
  /** Vertical (9:16) footage — the player switches to a portrait frame. */
  portrait?: boolean;
}

export interface Artist {
  slug: string;
  name: string;
  role: string;
  image: MediaImage;
  instagram?: string;
}

export interface Album {
  slug: string;
  title: string;
  /** ISO date, e.g. "2026-09-12". */
  date: string;
  venue: string;
  category: string;
  cover: string;
  photos: string[];
}

/** An event as saved by the admin dashboard. */
export interface StoredEvent extends BombitaEvent {
  id: string;
  /** false = draft (never shown publicly). */
  published: boolean;
  /** Scheduled go-live (ISO). Hidden from the public site until then. */
  publishAt?: string;
  createdAt: string;
  updatedAt: string;
}
