import ExcelJS from "exceljs";
import { isAdmin } from "@/lib/admin/auth";
import { listReservations } from "@/lib/store/reservations";

/** Excel export of birthday / VIP / group-night requests (admin only), soonest night first. */
const ny = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export async function GET() {
  if (!(await isAdmin())) return new Response("Not signed in", { status: 401 });

  const rows = (await listReservations()).sort((a, b) => a.date.localeCompare(b.date));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Bombita Admin";
  wb.created = new Date();
  const ws = wb.addWorksheet("Reservations");
  ws.columns = [
    { header: "Night", key: "date", width: 14 },
    { header: "Celebration", key: "type", width: 24 },
    { header: "Guests", key: "guests", width: 9 },
    { header: "Name", key: "name", width: 24 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 32 },
    { header: "Notes", key: "notes", width: 50 },
    { header: "Sent (NY)", key: "at", width: 22 },
  ];
  for (const r of rows) ws.addRow({ ...r, notes: r.notes ?? "", at: ny(r.at) });

  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FF050505" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0B94F" } };
  head.height = 22;
  ws.getColumn("notes").alignment = { wrapText: true, vertical: "top" };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };

  const buf = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bombita-reservations-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
