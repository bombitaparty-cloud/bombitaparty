import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Single-password admin auth. Set ADMIN_PASSWORD (and optionally ADMIN_SECRET
 * for signing) in the environment. Sessions are an HMAC-signed, httpOnly
 * cookie that expires after 7 days.
 */
export const ADMIN_COOKIE = "bombita_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);
const secret = () => process.env.ADMIN_SECRET || `bombita:${process.env.ADMIN_PASSWORD ?? ""}`;

const sign = (exp: number) => createHmac("sha256", secret()).update(`admin.${exp}`).digest("base64url");
const sha = (v: string) => createHash("sha256").update(v).digest();

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(sha(input), sha(expected));
}

export function createSessionValue(): string {
  const exp = Date.now() + MAX_AGE * 1000;
  return `${exp}.${sign(exp)}`;
}

export function verifySessionValue(value?: string): boolean {
  if (!value || !adminConfigured()) return false;
  const [expStr, sig] = value.split(".");
  const exp = Number(expStr);
  if (!exp || exp < Date.now() || !sig) return false;
  const good = Buffer.from(sign(exp));
  const got = Buffer.from(sig);
  return good.length === got.length && timingSafeEqual(good, got);
}

export const sessionCookie = (value: string) => ({
  name: ADMIN_COOKIE,
  value,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
});

export async function isAdmin(): Promise<boolean> {
  return verifySessionValue((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** Use at the top of every admin page and action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
