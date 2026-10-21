/**
 * Shared helpers for the database / media CLI scripts.
 * Loads .env.local then .env (existing variables always win) and validates
 * DATABASE_URL without ever printing the password.
 */
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(ROOT, file);
    if (fs.existsSync(p)) process.loadEnvFile(p);
  }
}

/** Host + database only — safe to print. */
export function describeDbUrl(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? `:${u.port}` : ""}/${u.pathname.replace(/^\//, "")}`;
  } catch {
    return "(unparseable)";
  }
}

/** Throws a readable error if DATABASE_URL is missing or malformed. Returns the URL. */
export function requireDatabaseUrl(name = "DATABASE_URL") {
  const url = process.env[name];
  if (!url) throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`${name} is not a valid URL.`);
  }
  if (!["postgres:", "postgresql:"].includes(u.protocol)) throw new Error(`${name} must start with postgres:// or postgresql://`);
  if (!u.password && !/localhost|127\.0\.0\.1/.test(u.hostname)) throw new Error(`${name} has no password.`);
  if (/neon\.tech$/.test(u.hostname) && u.searchParams.get("sslmode") !== "require" && u.searchParams.get("sslmode") !== "verify-full")
    throw new Error(`${name} points at Neon but is missing sslmode=require.`);
  return url;
}

/** Remove anything that looks like a connection string or password from an error message. */
export function redact(message) {
  return String(message)
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "postgres://***")
    .replace(/password=[^\s&'"]+/gi, "password=***")
    .replace(/npg_[A-Za-z0-9]+/g, "npg_***");
}
