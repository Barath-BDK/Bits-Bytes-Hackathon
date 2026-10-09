import "server-only";
import { createHash } from "node:crypto";

// Anonymous, stable per-IP id: lets the DB rate-limit and count distinct reporters without storing IPs.
export function reporterHash(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${process.env.REPORTER_SALT}:${ip}`).digest("hex");
}

export function rpcToken() {
  const t = process.env.DB_RPC_TOKEN;
  if (!t) throw new Error("DB_RPC_TOKEN is not set");
  return t;
}

// Reject cross-site form posts and oversized bodies before parsing anything.
export function guardWrite(req: Request, maxBytes = 8_000): Response | null {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return err("forbidden origin", 403);
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) return err("payload too large", 413);
  return null;
}

export function err(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// Map our Postgres error codes to HTTP; never leak raw DB messages.
export function dbError(e: { code?: string; message: string }) {
  switch (e.code) {
    case "22023": return err("location must be inside India", 400);
    case "P0429": return err("too many reports, try again later", 429);
    case "P0002": return err("not found", 404);
    default:
      console.error("db error", e.code, e.message);
      return err("server error", 500);
  }
}
