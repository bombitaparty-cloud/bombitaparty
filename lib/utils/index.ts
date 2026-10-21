import { clsx, type ClassValue } from "clsx";
import { site } from "@/data/site";
import type { BombitaEvent, EventStatus } from "@/lib/cms/types";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

const TZ = "America/New_York";

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions, locale = "en-US") =>
  new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts }).format(new Date(iso));

/** All the date fragments the editorial layouts need, in NYC time. */
export function eventDate(e: Pick<BombitaEvent, "startsAt" | "endsAt">) {
  const time = (iso: string) =>
    fmt(iso, { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", "");
  return {
    /** "SÁBADO" — Spanish weekday, on-brand for flyers. */
    weekdayEs: fmt(e.startsAt, { weekday: "long" }, "es-US").toUpperCase(),
    weekday: fmt(e.startsAt, { weekday: "long" }),
    weekdayShort: fmt(e.startsAt, { weekday: "short" }).toUpperCase(),
    month: fmt(e.startsAt, { month: "short" }).toUpperCase().replace(".", ""),
    monthLong: fmt(e.startsAt, { month: "long" }),
    day: fmt(e.startsAt, { day: "numeric" }),
    dayPadded: fmt(e.startsAt, { day: "2-digit" }),
    year: fmt(e.startsAt, { year: "numeric" }),
    long: fmt(e.startsAt, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    timeRange: e.endsAt ? `${time(e.startsAt)} – ${time(e.endsAt)}` : time(e.startsAt),
  };
}

export const ticketUrlFor = (e?: Pick<BombitaEvent, "ticketUrl">) =>
  e?.ticketUrl || site.ticketUrl;

export const tableUrlFor = (e?: Pick<BombitaEvent, "tableUrl">) =>
  e?.tableUrl || site.tableUrl;

export const statusLabel: Record<EventStatus, string> = {
  "on-sale": "Tickets on sale",
  "few-left": "Few tickets left",
  "sold-out": "Sold out",
  "coming-soon": "Coming soon",
  past: "Past event",
};

export const lineup = (e: Pick<BombitaEvent, "artists" | "djs">) =>
  [...e.artists, ...e.djs].filter(Boolean);

export function formatPrice(price: number | null, currency = "USD") {
  if (price == null) return "Price TBA";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

export const isExternal = (href: string) => /^(https?:)?\/\//.test(href) || href.startsWith("mailto:");

/** When an event is over: its end time, or 6 hours after doors when no end time is set. */
export function eventEndMs(e: Pick<BombitaEvent, "startsAt" | "endsAt">) {
  return e.endsAt ? new Date(e.endsAt).getTime() : new Date(e.startsAt).getTime() + 6 * 60 * 60 * 1000;
}
