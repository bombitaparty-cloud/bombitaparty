import "server-only";
import { cookies } from "next/headers";

/**
 * "Member" = a visitor who has given their email (gallery unlock, Join the
 * list, footer, RSVP). Not authentication — just remembers that this browser
 * already signed up so the gallery stays unlocked.
 */
export const MEMBER_COOKIE = "bombita_member";

export const memberCookie = {
  name: MEMBER_COOKIE,
  value: "1",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export async function isMember(): Promise<boolean> {
  return (await cookies()).get(MEMBER_COOKIE)?.value === "1";
}
