import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, CheckCircle2, Copy, Eye, EyeOff, FileEdit, Pencil, Star, Trash2, TriangleAlert } from "lucide-react";
import { readEvents, storageMode } from "@/lib/store/events";
import { deleteEvent, duplicateEvent, setFeatured, setPublished } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { cn, eventDate, eventEndMs, statusLabel } from "@/lib/utils";
import type { StoredEvent } from "@/lib/cms/types";

export const metadata: Metadata = { title: "Events" };

type Tab = "live" | "scheduled" | "drafts" | "past" | "all";

function stateOf(e: StoredEvent, now: number) {
  const ended = e.status === "past" || eventEndMs(e) < now;
  if (!e.published) return "drafts" as const;
  if (e.publishAt && new Date(e.publishAt).getTime() > now) return "scheduled" as const;
  return ended ? ("past" as const) : ("live" as const);
}

const fmtNy = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** Group events by visibility for the given tab (runs once per request). */
async function loadDashboard(tab: Tab) {
  const now = Date.now();
  const events = (await readEvents()).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const counts = { live: 0, scheduled: 0, drafts: 0, past: 0, all: events.length };
  for (const e of events) counts[stateOf(e, now)]++;
  const shown = (tab === "all" ? events : events.filter((e) => stateOf(e, now) === tab)).sort((a, b) =>
    tab === "past" ? +new Date(b.startsAt) - +new Date(a.startsAt) : 0,
  );
  return { now, counts, shown };
}

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const tab = (["live", "scheduled", "drafts", "past", "all"].includes(String(sp.tab)) ? sp.tab : "live") as Tab;
  const { now, counts, shown } = await loadDashboard(tab);

  const tabs: { key: Tab; label: string }[] = [
    { key: "live", label: "Live & upcoming" },
    { key: "scheduled", label: "Scheduled" },
    { key: "drafts", label: "Drafts" },
    { key: "past", label: "Past" },
    { key: "all", label: "All" },
  ];

  return (
    <>
      {sp.saved && (
        <p role="status" className="mb-6 flex items-center gap-3 border border-gold-400/40 bg-gold-400/10 px-4 py-3 text-sm text-gold-200">
          <CheckCircle2 className="h-4 w-4" /> Saved “{String(sp.saved)}”. The website is updated.
        </p>
      )}
      {sp.deleted && (
        <p role="status" className="mb-6 flex items-center gap-3 border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">
          <Trash2 className="h-4 w-4" /> Deleted “{String(sp.deleted)}”.
        </p>
      )}
      {storageMode === "readonly" && (
        <p className="mb-6 flex items-start gap-3 border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Saving is turned off: this deployment has no storage connected. In Vercel → Storage, connect a Blob store to the project, then redeploy.
        </p>
      )}
      {storageMode === "local" && (
        <p className="mb-6 border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-mute">
          Local development mode — changes are saved to <code>.data/events.json</code> on this computer.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wide md:text-6xl">Events</h1>
          <p className="mt-1 text-sm text-mute">Add, schedule and update the events shown on the website.</p>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: "live", label: "Live & upcoming", icon: Eye },
          { k: "scheduled", label: "Scheduled", icon: CalendarClock },
          { k: "drafts", label: "Drafts", icon: FileEdit },
          { k: "past", label: "Past", icon: CheckCircle2 },
        ].map(({ k, label, icon: Icon }) => (
          <div key={k} className="border border-white/10 bg-ink-900/60 p-4">
            <dt className="flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.22em] text-mute">
              <Icon className="h-3.5 w-3.5 text-gold-400" /> {label}
            </dt>
            <dd className="mt-2 font-display text-4xl">{counts[k as keyof typeof counts]}</dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Filter events" className="mt-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-px">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 pb-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] transition-colors",
              tab === t.key ? "border-gold-400 text-gold-300" : "border-transparent text-white/60 hover:text-white",
            )}
          >
            {t.label} <span className="text-white/40">({counts[t.key]})</span>
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <div className="mt-10 border border-dashed border-white/15 p-10 text-center text-mute">
          <p>No events here yet.</p>
          <Link href="/admin/events/new" className="mt-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-gold-300">
            + Create an event
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {shown.map((e) => {
            const d = eventDate(e);
            const st = stateOf(e, now);
            return (
              <li key={e.id} className="flex flex-col gap-4 border border-white/10 bg-ink-900/50 p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-ink-700">
                    <Image src={e.flyer.src} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="w-16 shrink-0 leading-none">
                    <span className="block text-[0.55rem] font-bold uppercase tracking-[0.2em] text-mute">{d.weekdayShort}</span>
                    <span className="mt-1 block font-display text-2xl">
                      {d.month} {d.day}
                    </span>
                    <span className="mt-1 block text-[0.6rem] text-mute">{d.year}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold text-white">
                      {e.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-gold-400 text-gold-400" aria-label="Featured" />}
                      <span className="truncate">{e.title}</span>
                    </p>
                    <p className="truncate text-xs text-mute">
                      {e.subtitle ? `${e.subtitle} · ` : ""}
                      {e.venue.name} · {d.timeRange}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-2 text-[0.55rem] font-bold uppercase tracking-[0.18em]">
                      <span
                        className={cn(
                          "border px-2 py-0.5",
                          st === "live" && "border-gold-400/50 text-gold-300",
                          st === "scheduled" && "border-sky-400/50 text-sky-300",
                          st === "drafts" && "border-white/25 text-white/60",
                          st === "past" && "border-white/15 text-white/40",
                        )}
                      >
                        {st === "live" ? "Live" : st === "scheduled" ? `Goes live ${fmtNy(e.publishAt!)}` : st === "drafts" ? "Draft" : "Past"}
                      </span>
                      <span className="border border-white/10 px-2 py-0.5 text-white/50">{statusLabel[e.status]}</span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Link href={`/admin/events/${e.id}`} className="flex h-9 items-center gap-1.5 bg-white/10 px-3 text-[0.6rem] font-bold uppercase tracking-[0.18em] hover:bg-white/20">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  {st === "live" || st === "past" ? (
                    <a href={`/events/${e.slug}`} target="_blank" rel="noopener noreferrer" title="View on site" aria-label="View on site" className="flex h-9 w-9 items-center justify-center border border-white/15 hover:border-white/40">
                      <Eye className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  <form action={setPublished}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="publish" value={e.published ? "0" : "1"} />
                    <button type="submit" title={e.published ? "Unpublish (make draft)" : "Publish now"} aria-label={e.published ? "Unpublish" : "Publish now"} className="flex h-9 w-9 items-center justify-center border border-white/15 hover:border-white/40">
                      {e.published ? <EyeOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-gold-300" />}
                    </button>
                  </form>
                  <form action={setFeatured}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" title={e.featured ? "Remove from homepage feature" : "Feature on homepage"} aria-label="Toggle featured" className="flex h-9 w-9 items-center justify-center border border-white/15 hover:border-white/40">
                      <Star className={cn("h-3.5 w-3.5", e.featured && "fill-gold-400 text-gold-400")} />
                    </button>
                  </form>
                  <form action={duplicateEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" title="Duplicate" aria-label="Duplicate" className="flex h-9 w-9 items-center justify-center border border-white/15 hover:border-white/40">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </form>
                  <form action={deleteEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <ConfirmSubmit
                      label="Delete"
                      message={`Delete “${e.title}”? This removes it from the website.`}
                      className="flex h-9 w-9 items-center justify-center border border-red-400/30 text-red-300 hover:border-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmSubmit>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
