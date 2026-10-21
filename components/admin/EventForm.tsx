"use client";

import { startTransition, useActionState, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Save, X } from "lucide-react";
import { saveEvent } from "@/app/admin/actions";
import { STATUSES, slugify } from "@/lib/admin/eventForm";
import type { StoredEvent } from "@/lib/cms/types";
import type { StorageMode } from "@/lib/store/events";
import { isoToNy } from "@/lib/utils/nyTime";
import { cn } from "@/lib/utils";
import { UploadButton } from "./UploadButton";

const input =
  "mt-1.5 h-11 w-full border border-white/15 bg-ink-900 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold-300 focus:outline-none";

function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-mute">{label}</span>
      {children}
      {error ? <span role="alert" className="mt-1 block text-xs text-red-300">{error}</span> : hint ? <span className="mt-1 block text-xs text-white/40">{hint}</span> : null}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border border-white/10 bg-ink-900/40 p-5 md:p-6">
      <legend className="px-2 font-display text-2xl tracking-wide text-gold-300">{title}</legend>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function EventForm({ event, storage, flow, access }: { event?: StoredEvent; storage: StorageMode; flow?: "token" | "presigned"; access?: "public" | "private" }) {
  const [state, action, pending] = useActionState(saveEvent, undefined);
  const e = state?.errors ?? {};
  const start = isoToNy(event?.startsAt);
  const end = isoToNy(event?.endsAt);
  const pub = isoToNy(event?.publishAt);

  const [title, setTitle] = useState(event?.title ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(event));
  const [flyer, setFlyer] = useState(event?.flyer.src ?? "");
  const [gallery, setGallery] = useState((event?.gallery ?? []).map((g) => g.src).join("\n"));
  const [video, setVideo] = useState(event?.video ?? "");
  const [visibility, setVisibility] = useState<"draft" | "now" | "schedule">(
    !event ? "now" : !event.published ? "draft" : event.publishAt && new Date(event.publishAt) > new Date() ? "schedule" : "now",
  );

  return (
    <form
      // Submit via a transition so React doesn't reset the fields when the
      // server returns validation errors.
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-6"
      noValidate
    >
      {event && <input type="hidden" name="id" value={event.id} />}

      {state?.message && (
        <p role="alert" className="border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.message}
        </p>
      )}

      <Section title="The event">
        <Field label="Event name *" error={e.title} className="md:col-span-2">
          <input
            name="title"
            value={title}
            onChange={(ev) => {
              setTitle(ev.target.value);
              if (!slugTouched) setSlug(slugify(ev.target.value));
            }}
            placeholder="El Rubio Acordeón"
            className={input}
          />
        </Field>
        <Field label="Subtitle" hint='e.g. "En Vivo"'>
          <input name="subtitle" defaultValue={event?.subtitle} className={input} />
        </Field>
        <Field label="Tagline" hint='e.g. "Cerrando el verano en grande"'>
          <input name="tagline" defaultValue={event?.tagline} className={input} />
        </Field>
        <Field label="Page URL" error={e.slug} hint={`bombita site/events/${slug || "…"}`} className="md:col-span-2">
          <input
            name="slug"
            value={slug}
            onChange={(ev) => {
              setSlugTouched(true);
              setSlug(slugify(ev.target.value));
            }}
            className={input}
          />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <textarea name="description" defaultValue={event?.description} rows={5} className={cn(input, "h-auto py-3")} placeholder="What makes this night special…" />
        </Field>
      </Section>

      <Section title="Date & time (New York time)">
        <Field label="Date *" error={e.date}>
          <input type="date" name="date" defaultValue={start.date} className={input} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts *" error={e.start}>
            <input type="time" name="start" defaultValue={start.time} className={input} />
          </Field>
          <Field label="Ends" error={e.end} hint="Earlier than start = next day">
            <input type="time" name="end" defaultValue={end.time} className={input} />
          </Field>
        </div>
      </Section>

      <Section title="Venue">
        <Field label="Venue name *" error={e.venueName}>
          <input name="venueName" defaultValue={event?.venue.name ?? "Radio Hotel"} className={input} />
        </Field>
        <Field label="Address">
          <input name="venueAddress" defaultValue={event?.venue.address} className={input} placeholder="2420 Amsterdam Ave" />
        </Field>
        <Field label="City">
          <input name="venueCity" defaultValue={event?.venue.city ?? "New York, NY"} className={input} />
        </Field>
        <Field label="Google Maps link" error={e.mapUrl}>
          <input name="mapUrl" defaultValue={event?.venue.mapUrl} className={input} placeholder="https://maps.google.com/…" />
        </Field>
      </Section>

      <Section title="Line-up">
        <Field label="Artists / live acts" hint="Separate with commas">
          <input name="artists" defaultValue={event?.artists.join(", ")} className={input} />
        </Field>
        <Field label="DJs" hint="Separate with commas">
          <input name="djs" defaultValue={event?.djs.join(", ")} className={input} />
        </Field>
      </Section>

      <Section title="Flyer & media">
        <div className="md:col-span-2">
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-mute">Main flyer *</span>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row">
            <div className="relative aspect-[4/5] w-40 shrink-0 overflow-hidden border border-white/15 bg-ink-800">
              {flyer ? (
                <Image src={flyer} alt="Flyer preview" fill sizes="160px" className="object-cover" unoptimized={flyer.startsWith("/uploads/")} />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-white/40">No flyer yet</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <UploadButton storage={storage} flow={flow} access={access} onUploaded={([u]) => setFlyer(u)} label="Upload flyer" />
              <input name="flyer" value={flyer} onChange={(ev) => setFlyer(ev.target.value)} className={input} placeholder="…or paste an image URL" />
              {e.flyer && <span role="alert" className="block text-xs text-red-300">{e.flyer}</span>}
              <input name="flyerAlt" defaultValue={event?.flyer.alt} className={input} placeholder="Short description of the flyer (for accessibility)" />
            </div>
          </div>
        </div>
        <Field label="Gallery photos" hint="One image URL per line — or upload several" className="md:col-span-2">
          <textarea name="gallery" value={gallery} onChange={(ev) => setGallery(ev.target.value)} rows={3} className={cn(input, "h-auto py-3 font-mono text-xs")} />
          <span className="mt-2 block">
            <UploadButton storage={storage} flow={flow} access={access} multiple label="Upload photos" onUploaded={(urls) => setGallery((g) => [g.trim(), ...urls].filter(Boolean).join("\n"))} />
          </span>
        </Field>
        <Field label="Video (MP4)" error={e.video} hint="Optional — shown on the event page" className="md:col-span-2">
          <input name="video" value={video} onChange={(ev) => setVideo(ev.target.value)} className={input} placeholder="https://…/recap.mp4" />
          <span className="mt-2 block">
            <UploadButton storage={storage} flow={flow} access={access} accept="video/mp4,video/quicktime,video/webm" label="Upload video" onUploaded={([u]) => setVideo(u)} />
          </span>
        </Field>
      </Section>

      <Section title="Tickets & tables">
        <Field label="Ticket link" error={e.ticketUrl} hint="Leave empty to use the site default (Boletos Express)">
          <input name="ticketUrl" defaultValue={event?.ticketUrl} className={input} placeholder="https://…" />
        </Field>
        <Field label="Table reservation link" error={e.tableUrl} hint="Leave empty to use the site default">
          <input name="tableUrl" defaultValue={event?.tableUrl} className={input} placeholder="https://…" />
        </Field>
        <Field label="Ticket status" error={e.status}>
          <select name="status" defaultValue={event?.status ?? "on-sale"} className={input}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Minimum age">
            <input type="number" min={0} name="ageLimit" defaultValue={event?.ageLimit ?? 21} className={input} />
          </Field>
          <Field label="Dress code">
            <input name="dressCode" defaultValue={event?.dressCode} className={input} />
          </Field>
        </div>
      </Section>

      <Section title="Publishing">
        <div className="space-y-3 md:col-span-2" role="radiogroup" aria-label="Visibility">
          {[
            { v: "now", t: "Publish now", d: "Shows on the website as soon as you save." },
            { v: "schedule", t: "Schedule", d: "Stays hidden until the date & time you choose (New York time)." },
            { v: "draft", t: "Save as draft", d: "Not visible on the website." },
          ].map((o) => (
            <label key={o.v} className={cn("flex cursor-pointer gap-3 border p-4", visibility === o.v ? "border-gold-400/60 bg-gold-400/5" : "border-white/10")}>
              <input type="radio" name="visibility" value={o.v} checked={visibility === o.v} onChange={() => setVisibility(o.v as typeof visibility)} className="mt-1 accent-[#e0b94f]" />
              <span>
                <span className="block text-sm font-semibold">{o.t}</span>
                <span className="block text-xs text-mute">{o.d}</span>
              </span>
            </label>
          ))}
          {visibility === "schedule" && (
            <div className="grid grid-cols-2 gap-4 pl-1">
              <Field label="Go-live date" error={e.publishDate}>
                <input type="date" name="publishDate" defaultValue={pub.date} className={input} />
              </Field>
              <Field label="Go-live time">
                <input type="time" name="publishTime" defaultValue={pub.time || "09:00"} className={input} />
              </Field>
            </div>
          )}
        </div>
        <label className="flex cursor-pointer items-start gap-3 md:col-span-2">
          <input type="checkbox" name="featured" defaultChecked={event?.featured} className="mt-1 accent-[#e0b94f]" />
          <span>
            <span className="block text-sm font-semibold">Feature on the homepage</span>
            <span className="block text-xs text-mute">Shown as the “Next” event in the hero. Only one event can be featured.</span>
          </span>
        </label>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-white/10 bg-ink-950/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
        <Link href="/admin" className="flex h-11 items-center gap-2 border border-white/15 px-5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/80 hover:border-white/40">
          <X className="h-4 w-4" /> Cancel
        </Link>
        <button
          type="submit"
          disabled={pending || storage === "readonly"}
          className="flex h-11 items-center gap-2 bg-gold-400 px-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-950 hover:bg-gold-300 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {event ? "Save changes" : "Create event"}
        </button>
      </div>
    </form>
  );
}
