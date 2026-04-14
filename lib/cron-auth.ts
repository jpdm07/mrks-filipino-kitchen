import type { NextRequest } from "next/server";

/**
 * Vercel Cron: if CRON_SECRET is set, require Authorization: Bearer <secret>.
 * If unset on Vercel (VERCEL=1), scheduled invocations are identified via
 * x-vercel-cron or user-agent vercel-cron/* (see Vercel cron docs / runtime).
 * Local non-production: allows GET for manual testing without a secret.
 */
export function isAuthorizedCronGet(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    return req.headers.get("authorization") === `Bearer ${secret}`;
  }
  if (process.env.VERCEL === "1") {
    const cronHeader = req.headers.get("x-vercel-cron");
    const ua = req.headers.get("user-agent") ?? "";
    return cronHeader === "1" || ua.startsWith("vercel-cron/");
  }
  return process.env.NODE_ENV !== "production";
}
