/** Convert between NYC wall-clock time (what the client types) and ISO strings. */

const TZ = "America/New_York";

/** "-04:00" / "-05:00" — NYC's UTC offset at a given instant. */
export function nyOffset(at: Date): string {
  const tz =
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT-05:00";
  return tz === "GMT" ? "+00:00" : tz.replace("GMT", "");
}

const offsetMinutes = (off: string) => (off[0] === "-" ? -1 : 1) * (Number(off.slice(1, 3)) * 60 + Number(off.slice(4, 6)));

/** "2026-10-10" + "15:00" (NYC) → "2026-10-10T15:00:00-04:00" (DST-correct). */
export function nyLocalToIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let off = nyOffset(new Date(wall));
  off = nyOffset(new Date(wall - offsetMinutes(off) * 60000));
  return `${date}T${time.padStart(5, "0")}:00${off}`;
}

/** ISO → { date: "2026-10-10", time: "15:00" } in NYC, for prefilling forms. */
export function isoToNy(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Add days to a YYYY-MM-DD string. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date in New York as YYYY-MM-DD. */
export function nyToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
