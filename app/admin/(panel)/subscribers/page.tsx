import type { Metadata } from "next";
import Link from "next/link";
import { Download, Mail, Search, Users } from "lucide-react";
import { aggregate, listSignups, SOURCE_LABEL, type SignupSource } from "@/lib/store/subscribers";
import { storageMode } from "@/lib/store/events";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Subscribers" };

const ny = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

const SOURCES = Object.keys(SOURCE_LABEL) as SignupSource[];

/** Counts for the stat cards (runs once per request). */
async function load(q: string, source: string) {
  const records = await listSignups();
  const people = aggregate(records);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const stats = {
    total: people.length,
    today: people.filter((p) => +new Date(p.firstSeen) >= dayAgo).length,
    week: people.filter((p) => +new Date(p.firstSeen) >= weekAgo).length,
    gallery: people.filter((p) => p.sources.includes("gallery")).length,
  };
  const needle = q.trim().toLowerCase();
  const shown = people.filter(
    (p) =>
      (!needle || `${p.email} ${p.name ?? ""} ${p.city ?? ""}`.toLowerCase().includes(needle)) &&
      (!source || p.sources.includes(source as SignupSource)),
  );
  return { stats, shown };
}

export default async function SubscribersPage({ searchParams }: PageProps<"/admin/subscribers">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const source = typeof sp.source === "string" && SOURCES.includes(sp.source as SignupSource) ? sp.source : "";
  const { stats, shown } = await load(q, source);
  const qs = (next: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(source && { source }), ...next });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const s = p.toString();
    return s ? `/admin/subscribers?${s}` : "/admin/subscribers";
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wide md:text-6xl">Subscribers</h1>
          <p className="mt-1 text-sm text-mute">Everyone who signed up — gallery unlocks, Join the list, footer and RSVPs.</p>
          <div className="mt-3">
            <AutoRefresh />
          </div>
        </div>
        <a
          href="/api/admin/subscribers/export"
          className="flex h-11 items-center gap-2 bg-gold-400 px-5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-950 hover:bg-gold-300"
        >
          <Download className="h-4 w-4" /> Download Excel
        </a>
      </div>

      {storageMode === "readonly" && (
        <p className="mt-6 border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          No storage connected — signups are not being saved. Connect a Vercel Blob store to the project.
        </p>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total emails", value: stats.total, icon: Users },
          { label: "New today", value: stats.today, icon: Mail },
          { label: "New this week", value: stats.week, icon: Mail },
          { label: "Gallery unlocks", value: stats.gallery, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-white/10 bg-ink-900/60 p-4">
            <dt className="flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.22em] text-mute">
              <Icon className="h-3.5 w-3.5 text-gold-400" /> {label}
            </dt>
            <dd className="mt-2 font-display text-4xl">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <form action="/admin/subscribers" className="flex h-11 w-full items-center gap-2 border border-white/15 bg-ink-900 px-3 focus-within:border-gold-300 md:max-w-sm">
          <Search className="h-4 w-4 text-white/50" aria-hidden />
          <label htmlFor="sub-q" className="sr-only">
            Search subscribers
          </label>
          <input id="sub-q" name="q" defaultValue={q} placeholder="Search email, name, city" className="h-full min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
          {source && <input type="hidden" name="source" value={source} />}
        </form>
        <nav aria-label="Filter by source" className="flex gap-2 overflow-x-auto">
          {[{ key: "", label: "All" }, ...SOURCES.map((s) => ({ key: s, label: SOURCE_LABEL[s] }))].map((f) => (
            <Link
              key={f.key || "all"}
              href={qs({ source: f.key })}
              aria-current={source === f.key ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center border px-3 text-[0.6rem] font-bold uppercase tracking-[0.18em]",
                source === f.key ? "border-gold-400 bg-gold-400 text-ink-950" : "border-white/15 text-white/70 hover:border-white/40",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 border border-dashed border-white/15 p-10 text-center text-mute">
          {stats.total === 0 ? "No signups yet — they'll appear here as people unlock the gallery or join the list." : "No subscribers match this search."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-ink-900 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Signed up via</th>
                <th className="px-4 py-3">First signup</th>
                <th className="px-4 py-3">Latest</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.email} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <a href={`mailto:${p.email}`} className="text-white hover:text-gold-300">
                      {p.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-white/80">{p.name ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60">{p.city ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      {p.sources.map((s) => (
                        <span key={s} className="border border-white/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.15em] text-white/70">
                          {SOURCE_LABEL[s]}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">{ny(p.firstSeen)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">{ny(p.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-white/40">
        Showing {shown.length} of {stats.total}. The Excel file always includes everyone, plus a sheet of every individual signup.
      </p>
    </>
  );
}
