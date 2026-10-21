import type { EventStatus, StoredEvent } from "@/lib/cms/types";
import { addDays, nyLocalToIso } from "@/lib/utils/nyTime";

/** Shape returned to the event form after a failed save. */
export interface EventFormState {
  ok?: boolean;
  message?: string;
  errors?: Partial<Record<string, string>>;
}

export const STATUSES: { value: EventStatus; label: string }[] = [
  { value: "on-sale", label: "Tickets on sale" },
  { value: "few-left", label: "Few tickets left" },
  { value: "sold-out", label: "Sold out" },
  { value: "coming-soon", label: "Coming soon (notify me)" },
  { value: "past", label: "Past / archived" },
];

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const list = (v: string) =>
  v
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
const isUrl = (v: string) => /^(https?:\/\/|\/)/.test(v);

/**
 * Parse + validate the event form. Returns the event (minus id/timestamps)
 * or a map of field errors.
 */
export function parseEventForm(
  f: FormData,
): { event: Omit<StoredEvent, "id" | "createdAt" | "updatedAt">; errors?: undefined } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const title = str(f, "title");
  const slug = slugify(str(f, "slug") || title);
  const date = str(f, "date");
  const start = str(f, "start");
  const end = str(f, "end");
  const flyer = str(f, "flyer");
  const visibility = str(f, "visibility") as "draft" | "now" | "schedule";
  const publishDate = str(f, "publishDate");
  const publishTime = str(f, "publishTime") || "09:00";
  const status = str(f, "status") as EventStatus;

  if (title.length < 2) errors.title = "Give the event a name.";
  if (!slug) errors.slug = "Add a URL slug.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = "Pick the event date.";
  if (!/^\d{2}:\d{2}$/.test(start)) errors.start = "Pick a start time.";
  if (end && !/^\d{2}:\d{2}$/.test(end)) errors.end = "Pick a valid end time.";
  if (!str(f, "venueName")) errors.venueName = "Add the venue.";
  if (!flyer) errors.flyer = "Upload a flyer or paste an image URL.";
  else if (!isUrl(flyer)) errors.flyer = "The flyer must be an uploaded image or an https:// URL.";
  for (const k of ["ticketUrl", "tableUrl", "video", "mapUrl"]) {
    const v = str(f, k);
    if (v && !isUrl(v)) errors[k] = "Use a full link starting with https://";
  }
  if (!STATUSES.some((s) => s.value === status)) errors.status = "Choose a status.";
  if (visibility === "schedule" && !/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) errors.publishDate = "Pick when it should go live.";
  if (Object.keys(errors).length) return { errors };

  const startsAt = nyLocalToIso(date, start);
  // An end time earlier than the start (e.g. 10PM → 4AM) ends the next day.
  const endsAt = end ? nyLocalToIso(end <= start ? addDays(date, 1) : date, end) : undefined;
  const age = Number(str(f, "ageLimit"));

  return {
    event: {
      slug,
      title,
      subtitle: str(f, "subtitle") || undefined,
      tagline: str(f, "tagline") || undefined,
      startsAt,
      endsAt,
      venue: {
        name: str(f, "venueName"),
        address: str(f, "venueAddress"),
        city: str(f, "venueCity") || "New York, NY",
        mapUrl: str(f, "mapUrl") || undefined,
      },
      artists: list(str(f, "artists")),
      djs: list(str(f, "djs")),
      description: str(f, "description"),
      flyer: { src: flyer, alt: str(f, "flyerAlt") || title },
      gallery: list(str(f, "gallery")).filter(isUrl).map((src) => ({ src, alt: title })),
      video: str(f, "video") || undefined,
      ticketUrl: str(f, "ticketUrl") || undefined,
      tableUrl: str(f, "tableUrl") || undefined,
      status,
      featured: f.get("featured") === "on",
      ageLimit: Number.isFinite(age) && age > 0 ? age : undefined,
      dressCode: str(f, "dressCode") || undefined,
      published: visibility !== "draft",
      publishAt: visibility === "schedule" ? nyLocalToIso(publishDate, publishTime) : undefined,
    },
  };
}
