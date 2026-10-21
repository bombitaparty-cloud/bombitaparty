import { NextResponse } from "next/server";
import { validateRsvp, type RsvpInput } from "@/lib/utils/validation";
import { addSignup } from "@/lib/store/subscribers";
import { memberCookie } from "@/lib/member";

/** Guest-list RSVP endpoint. Forward to your CRM / email / sheet where marked. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<RsvpInput>;
  const input: RsvpInput = {
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    guests: String(body.guests ?? ""),
    event: String(body.event ?? ""),
  };
  const errors = validateRsvp(input);
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  // Saved to the admin Subscribers list (source "Event RSVP", with the event).
  // TODO(production): also notify the door team (e.g. Resend email) if needed.
  try {
    await addSignup({ email: input.email, name: input.name, source: "rsvp", event: `${input.event} (+${Number(input.guests) - 1})` });
  } catch (err) {
    console.error("[rsvp] could not save", err);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(memberCookie);
  return res;
}
