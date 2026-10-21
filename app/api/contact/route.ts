import { NextResponse } from "next/server";
import { validateContact, type ContactInput } from "@/lib/utils/validation";

/**
 * Contact form endpoint. Validates server-side, then hands off to your
 * email provider. Wire up Resend / Postmark / SendGrid where marked.
 */
export async function POST(req: Request) {
  let body: Partial<ContactInput> & { company?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields, humans don't.
  if (body.company) return NextResponse.json({ ok: true });

  const input: ContactInput = {
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    subject: String(body.subject ?? ""),
    message: String(body.message ?? ""),
  };
  const errors = validateContact(input);
  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  // TODO(production): send the message, e.g. with Resend:
  // await resend.emails.send({ from: "site@bombita.nyc", to: site.contact.email, replyTo: input.email, subject: `[${input.subject}] ${input.name}`, text: input.message });
  console.info("[contact] new inquiry", { subject: input.subject, from: input.email });

  return NextResponse.json({ ok: true });
}
