/**
 * Runs `prisma migrate deploy` after loading env the same way as local dev:
 * `.env` first, then `.env.local` with override so a production DATABASE_URL in
 * `.env.local` is visible to the Prisma CLI (which only auto-loads `.env`).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const localPath = resolve(root, ".env.local");

if (existsSync(envPath)) config({ path: envPath });
if (existsSync(localPath)) config({ path: localPath, override: true });

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
  cwd: root,
});

process.exit(result.status ?? 1);
