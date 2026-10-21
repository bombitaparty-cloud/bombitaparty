import type { Metadata } from "next";
import { CalendarHeart, Download, PartyPopper, Users } from "lucide-react";
import { listReservations } from "@/lib/store/reservations";
import { storageMode } from "@/lib/store/events";
import { nyToday } from "@/lib/utils/nyTime";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reservations" };

const ny = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** "2026-10-31" → "Sat, Oct 31, 2026" (a calendar date — no timezone shift). */
const night = (d: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${d}T12:00:00Z`));

/** Splits requests into upcoming / past nights and builds the stat cards (once per request). */
async function load() {
  const all = await listReservations();
  const today = nyToday();
  const upcoming = all.filter((r) => r.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = all.filter((r) => r.date < today);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const stats = [
    { label: "Total requests", value: all.length, icon: CalendarHeart },
    { label: "Upcoming", value: upcoming.length, icon: PartyPopper },
    { label: "New this week", value: all.filter((r) => +new Date(r.at) >= weekAgo).length, icon: CalendarHeart },
    { label: "Guests upcoming", value: upcoming.reduce((n, r) => n + r.guests, 0), icon: Users },
  ];
  return { all, today, upcoming, past, stats };
}

export default async function ReservationsPage() {
  const { all, today, upcoming, past, stats } = await load();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wide md:text-6xl">Reservations</h1>
          <p className="mt-1 text-sm text-mute">Birthday, VIP table and group-night requests from the Birthdays page.</p>
          <div className="mt-3">
            <AutoRefresh />
          </div>
        </div>
        <a
          href="/api/admin/reservations/export"
          className="flex h-11 items-center gap-2 bg-gold-400 px-5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-950 hover:bg-gold-300"
        >
          <Download className="h-4 w-4" /> Download Excel
        </a>
      </div>

      {storageMode === "readonly" && (
        <p className="mt-6 border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          No storage connected — requests are not being saved. Connect a Vercel Blob store to the project.
        </p>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-white/10 bg-ink-900/60 p-4">
            <dt className="flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.22em] text-mute">
              <Icon className="h-3.5 w-3.5 text-gold-400" /> {label}
            </dt>
            <dd className="mt-2 font-display text-4xl">{value}</dd>
          </div>
        ))}
      </dl>

      {all.length === 0 ? (
        <p className="mt-10 border border-dashed border-white/15 p-10 text-center text-mute">
          No requests yet — they&apos;ll appear here as people fill in the Birthdays form.
        </p>
      ) : (
        [
          { title: "Upcoming nights", rows: upcoming },
          { title: "Past nights", rows: past },
        ]
          .filter((g) => g.rows.length)
          .map((g) => (
            <section key={g.title} className="mt-10">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-gold-300">
                {g.title} · {g.rows.length}
              </h2>
              <div className="mt-3 overflow-x-auto border border-white/10">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-ink-900 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute">
                    <tr>
                      <th className="px-4 py-3">Night</th>
                      <th className="px-4 py-3">Celebration</th>
                      <th className="px-4 py-3">Guests</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Notes</th>
                      <th className="px-4 py-3">Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.at + r.email} className={cn("border-t border-white/5 align-top hover:bg-white/[0.03]", r.date === today && "bg-gold-400/[0.06]")}>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
                          {night(r.date)}
                          {r.date === today && <span className="ml-2 bg-gold-400 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-ink-950">Tonight</span>}
                        </td>
                        <td className="px-4 py-3 text-white/80">{r.type}</td>
                        <td className="px-4 py-3 text-white/80">{r.guests}</td>
                        <td className="px-4 py-3 text-white">{r.name}</td>
                        <td className="px-4 py-3">
                          <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="block text-white hover:text-gold-300">
                            {r.phone}
                          </a>
                          <a href={`mailto:${r.email}`} className="block text-xs text-white/60 hover:text-gold-300">
                            {r.email}
                          </a>
                        </td>
                        <td className="max-w-xs px-4 py-3 text-white/70">{r.notes ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-white/50">{ny(r.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
      )}
    </>
  );
}
