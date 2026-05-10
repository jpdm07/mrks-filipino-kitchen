/**
 * Prisma schema uses `directUrl` for migrations on Neon. Poolers cannot reliably take
 * advisory locks — Neon provides a separate **direct** URL for migrations.
 *
 * If `DATABASE_URL` is already non-pooled (local Docker, single Neon URL), duplicate it
 * into `DIRECT_URL` when unset so `prisma generate` / migrate still resolve env().
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function loadDotenvFromProjectRoot() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const envPath = resolve(root, ".env");
  const localPath = resolve(root, ".env.local");
  if (existsSync(envPath)) config({ path: envPath });
  if (existsSync(localPath)) config({ path: localPath, override: true });
}

export function urlLooksNeonPooled(u) {
  return /-pooler\./i.test(u) || /pooler\.neon\.tech/i.test(u);
}

export function ensureDirectUrlFallback() {
  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
  const direct = process.env.DIRECT_URL?.trim();
  if (direct || !dbUrl) return;
  if (urlLooksNeonPooled(dbUrl)) return;
  process.env.DIRECT_URL = dbUrl;
}
