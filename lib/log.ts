/**
 * Structured (JSON-line) logging for server code. Values that look like
 * connection strings, passwords or tokens are redacted before printing.
 */
type Fields = Record<string, unknown>;

const SECRET = /(postgres(?:ql)?:\/\/[^\s'"]+|npg_[A-Za-z0-9]+|vercel_blob_rw_[A-Za-z0-9_]+|password=[^\s&'"]+)/gi;

export const redact = (v: unknown): unknown =>
  typeof v === "string" ? v.replace(SECRET, "***") : v instanceof Error ? redact(v.message) : v;

function write(level: "info" | "warn" | "error", event: string, fields: Fields = {}) {
  const clean: Fields = {};
  for (const [k, v] of Object.entries(fields)) clean[k] = redact(v);
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...clean });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
};
