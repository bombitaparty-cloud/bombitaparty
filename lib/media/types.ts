/** Shapes shared by the gallery API, the gallery UI and the admin. No server imports. */

export type MediaType = "image" | "video";
export type MediaStatus = "pending" | "processing" | "ready" | "failed";
export type MediaVisibility = "draft" | "published";
export type VariantKind = "thumb" | "display" | "large" | "poster" | "video";

export interface MediaRendition {
  url: string;
  w: number | null;
  h: number | null;
}

/** One gallery item as returned by GET /api/gallery. Never contains bytes or storage paths. */
export interface GalleryItem {
  id: string;
  type: MediaType;
  title: string | null;
  caption: string | null;
  date: string; // gallery date, YYYY-MM-DD
  width: number | null;
  height: number | null;
  duration: number | null;
  category: string | null;
  event: string | null;
  tags: string[];
  thumb: MediaRendition;
  display: MediaRendition | null;
  large: MediaRendition | null;
  poster: MediaRendition | null;
  video: MediaRendition | null;
}

export interface GalleryPage {
  items: GalleryItem[];
  nextCursor: string | null;
}

export interface GalleryDateSummary {
  date: string;
  count: number;
  images: number;
  videos: number;
  cover: string | null;
}

export interface GalleryFacets {
  dates: GalleryDateSummary[];
  categories: { name: string; count: number }[];
  tags: { slug: string; name: string; count: number }[];
  total: number;
}

export interface GalleryFilters {
  date?: string;
  from?: string;
  to?: string;
  type?: MediaType;
  category?: string;
  tag?: string;
}

/** Admin list row. */
export interface AdminMediaItem extends Omit<GalleryItem, "tags"> {
  tags: { slug: string; name: string }[];
  originalFilename: string;
  description: string | null;
  mimeType: string;
  fileSizeBytes: number;
  checksum: string;
  capturedAt: string | null;
  dateSource: "event" | "capture" | "directory" | "manual";
  displayOrder: number;
  status: MediaStatus;
  visibility: MediaVisibility;
  error: string | null;
  uploadedAt: string;
  webBytes: number;
}

export interface MediaStats {
  total: number;
  byStatus: Record<MediaStatus, number>;
  published: number;
  drafts: number;
  images: number;
  videos: number;
  dates: number;
  originalBytes: number;
  webBytes: number;
  blobBytes: number;
  budgetBytes: number;
}
