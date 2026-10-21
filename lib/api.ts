import "server-only";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { log } from "@/lib/log";

/**
 * Small, consistent API toolkit: typed errors → JSON + status code, request
 * logging, per-IP rate limits and the admin guard used by every media route.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new ApiError(400, "bad_request", message, details);

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler: maps errors to JSON responses and logs one line per request. */
export function route<C>(name: string, fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    const t = Date.now();
    try {
      const res = await fn(req, ctx);
      if (res.status >= 500) log.warn("api.response", { route: name, status: res.status, ms: Date.now() - t });
      return res;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status >= 500) log.error("api.error", { route: name, status: err.status, code: err.code, error: err.message });
        return NextResponse.json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.status, headers: { "Cache-Control": "no-store" } });
      }
      if (err instanceof DatabaseNotConfiguredError) {
        log.error("api.db_not_configured", { route: name });
        return NextResponse.json({ error: { code: "unavailable", message: "The gallery database is not configured." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      log.error("api.unhandled", { route: name, error: err instanceof Error ? err.message : String(err), ms: Date.now() - t });
      return NextResponse.json({ error: { code: "internal", message: "Something went wrong." } }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
  };
}

/* ── Rate limiting (per server instance, sliding window) ─────────────────── */

const buckets = new Map<string, number[]>();

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

/** Throws 429 when `key` exceeded `limit` requests in the last `windowMs`. */
export function rateLimit(req: Request, scope: string, limit: number, windowMs = 60_000) {
  const key = `${scope}:${clientIp(req)}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    throw new ApiError(429, "rate_limited", "Too many requests — slow down and try again shortly.", { retryAfterSeconds: Math.ceil((windowMs - (now - hits[0])) / 1000) });
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
}

/**
 * Admin guard for API routes. Requires a valid admin session cookie, and for
 * mutating requests the custom `x-bombita-admin` header, which cross-site
 * forms cannot send (CSRF protection on top of SameSite=Lax cookies).
 */
export async function requireAdminApi(req: Request) {
  if (!(await isAdmin())) throw new ApiError(401, "unauthorized", "Sign in to the admin first.");
  if (req.method !== "GET" && req.method !== "HEAD" && req.headers.get("x-bombita-admin") !== "1") {
    throw new ApiError(403, "forbidden", "Missing admin request header.");
  }
}

export async function readJson<T>(req: Request, maxBytes = 256 * 1024): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new ApiError(413, "too_large", "Request body is too large.");
  try {
    return (await req.json()) as T;
  } catch {
    throw badRequest("Body must be valid JSON.");
  }
}

/* ── Tiny validators (no extra dependency) ───────────────────────────────── */

export const str = (v: unknown, max: number, field: string): string | null => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw badRequest(`${field} must be text.`);
  const t = v.trim();
  if (t.length > max) throw badRequest(`${field} must be at most ${max} characters.`);
  return t || null;
};

export const oneOf = <T extends string>(v: unknown, allowed: readonly T[], field: string): T | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  if (!allowed.includes(v as T)) throw badRequest(`${field} must be one of: ${allowed.join(", ")}.`);
  return v as T;
};
