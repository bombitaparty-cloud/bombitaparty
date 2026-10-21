import { NextResponse } from "next/server";
import { validateBirthday, type BirthdayInput } from "@/lib/utils/validation";
import { nyToday } from "@/lib/utils/nyTime";
import { addReservation } from "@/lib/store/reservations";
import { addSignup } from "@/lib/store/subscribers";
import { memberCookie } from "@/lib/member";

/**
 * Birthday / VIP table / group-night requests. Saved for Admin → Reservations,
 * and the email joins the subscriber list (source "Birthday / VIP request").
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.company) return NextResponse.json({ ok: true }); // honeypot
  const input: BirthdayInput = {
    name: String(body.name ?? ""),
    phone: String(body.phone ?? ""),
    email: String(body.email ?? ""),
    type: String(body.type ?? ""),
    date: String(body.date ?? ""),
    guests: String(body.guests ?? ""),
    notes: String(body.notes ?? ""),
  };
  const errors = validateBirthday(input, nyToday());
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  let saved = false;
  try {
    saved = await addReservation({ ...input, guests: Number(input.guests) });
  } catch (err) {
    console.error("[birthday] could not save request", err);
  }
  if (!saved) return NextResponse.json({ ok: false, error: "Could not save your request." }, { status: 503 });

  try {
    await addSignup({ email: input.email, name: input.name, source: "birthday", event: `${input.type} · ${input.date} · ${input.guests} guests` });
  } catch (err) {
    console.error("[birthday] could not add to list", err);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(memberCookie);
  return res;
}
