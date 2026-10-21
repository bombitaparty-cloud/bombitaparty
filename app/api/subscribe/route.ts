import { NextResponse } from "next/server";
import { validateEmail, validateSignup } from "@/lib/utils/validation";
import { addSignup, type SignupSource } from "@/lib/store/subscribers";
import { memberCookie } from "@/lib/member";

/**
 * Email signups. Accepts { email, source? } (gallery unlock / footer) or the
 * full Join-the-list form { firstName, lastName, email, city }. Saves the
 * email for the admin dashboard and sets the member cookie, which unlocks
 * the gallery in this browser.
 */
const SOURCES: SignupSource[] = ["gallery", "join", "footer"];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.company) return NextResponse.json({ ok: true }); // honeypot
  const email = String(body.email ?? "").trim();
  let name: string | undefined;
  let city: string | undefined;
  let source: SignupSource = SOURCES.includes(body.source as SignupSource) ? (body.source as SignupSource) : "footer";

  if (body.firstName !== undefined) {
    const input = {
      firstName: String(body.firstName ?? ""),
      lastName: String(body.lastName ?? ""),
      email,
      city: String(body.city ?? ""),
    };
    const errors = validateSignup(input);
    if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });
    name = `${input.firstName} ${input.lastName}`.trim();
    city = input.city || undefined;
    source = "join";
  } else if (!email || validateEmail(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 422 });
  }

  try {
    await addSignup({ email, name, city, source });
  } catch (err) {
    // Don't lock people out of the gallery over a storage hiccup.
    console.error("[subscribe] could not save signup", err);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(memberCookie);
  return res;
}
