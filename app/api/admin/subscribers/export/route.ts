import ExcelJS from "exceljs";
import { isAdmin } from "@/lib/admin/auth";
import { aggregate, listSignups, SOURCE_LABEL } from "@/lib/store/subscribers";

/** Excel export of the email list (admin only). Sheet 1: one row per email. Sheet 2: every signup. */
const ny = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export async function GET() {
  if (!(await isAdmin())) return new Response("Not signed in", { status: 401 });

  const records = await listSignups();
  const people = aggregate(records);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Bombita Admin";
  wb.created = new Date();

  const gold = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE0B94F" } };
  const styleHeader = (ws: ExcelJS.Worksheet) => {
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: "FF050505" } };
    row.fill = gold;
    row.height = 22;
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  };

  const subs = wb.addWorksheet("Subscribers");
  subs.columns = [
    { header: "Email", key: "email", width: 34 },
    { header: "Name", key: "name", width: 24 },
    { header: "City", key: "city", width: 16 },
    { header: "Signed up via", key: "sources", width: 34 },
    { header: "RSVP events", key: "events", width: 34 },
    { header: "First signup (NY)", key: "first", width: 22 },
    { header: "Latest activity (NY)", key: "last", width: 22 },
    { header: "Signups", key: "count", width: 10 },
  ];
  for (const p of people) {
    subs.addRow({
      email: p.email,
      name: p.name ?? "",
      city: p.city ?? "",
      sources: p.sources.map((s) => SOURCE_LABEL[s]).join(", "),
      events: p.events.join(", "),
      first: ny(p.firstSeen),
      last: ny(p.lastSeen),
      count: p.count,
    });
  }
  styleHeader(subs);

  const all = wb.addWorksheet("All signups");
  all.columns = [
    { header: "Date (NY)", key: "at", width: 22 },
    { header: "Email", key: "email", width: 34 },
    { header: "Name", key: "name", width: 24 },
    { header: "City", key: "city", width: 16 },
    { header: "Source", key: "source", width: 18 },
    { header: "Event", key: "event", width: 34 },
  ];
  for (const r of records) {
    all.addRow({ at: ny(r.at), email: r.email, name: r.name ?? "", city: r.city ?? "", source: SOURCE_LABEL[r.source], event: r.event ?? "" });
  }
  styleHeader(all);

  const buf = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bombita-subscribers-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
