/**
 * Runs `prisma migrate deploy` after loading env like local dev (`.env` then `.env.local`).
 *
 * Prisma uses `directUrl` in schema for migrations on Neon (advisory locks need a direct
 * connection, not the pooler).
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import {
  ensureDirectUrlFallback,
  loadDotenvFromProjectRoot,
  urlLooksNeonPooled,
} from "./ensure-prisma-direct-url.mjs";

function sleepSync(ms) {
  const sab = new SharedArrayBuffer(4);
  const ia = new Int32Array(sab);
  Atomics.wait(ia, 0, 0, Math.min(ms, 2147483647));
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

loadDotenvFromProjectRoot();
ensureDirectUrlFallback();

const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
const direct = process.env.DIRECT_URL?.trim();

if (dbUrl && urlLooksNeonPooled(dbUrl) && !direct) {
  console.error(
    "[db:migrate] DATABASE_URL looks like a Neon pooler. Add DIRECT_URL (the **direct** " +
      "connection string from Neon → Connect, not *-pooler*), then run again.\n"
  );
  process.exit(1);
}

if (direct && urlLooksNeonPooled(direct)) {
  console.error(
    "[db:migrate] DIRECT_URL still looks pooled (*-pooler*). Use Neon’s **direct** host for migrations.\n"
  );
  process.exit(1);
}

function runOnce() {
  return spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: process.env,
    shell: true,
    cwd: root,
  });
}

const first = runOnce();
if (first.status === 0) {
  process.exit(0);
}

console.warn(
  "\n[db:migrate] migrate deploy failed (exit " +
    String(first.status ?? "?") +
    "). Retrying once after 15s (Neon advisory lock / pooler contention).\n"
);
sleepSync(15_000);

const second = runOnce();
process.exit(second.status ?? 1);
