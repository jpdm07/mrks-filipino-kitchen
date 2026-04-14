/**
 * Vercel/CI: apply migrations to Postgres, then generate client, then `next build`.
 * Local: skips `migrate deploy` unless RUN_MIGRATE_ON_BUILD=1.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

function run(label, command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`[build-production] failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

const onVercel = Boolean(process.env.VERCEL);
const forceMigrate = process.env.RUN_MIGRATE_ON_BUILD === "1";

if (onVercel || forceMigrate) {
  run("prisma migrate deploy", "npx", ["prisma", "migrate", "deploy"]);
}

run("prisma generate", "node", ["scripts/prisma-generate.mjs"]);
run("next build", "npx", ["next", "build"]);
