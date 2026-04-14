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
    console.error(`\n[build-production] FAILED at step: ${label}\n`);
    process.exit(result.status ?? 1);
  }
}

const onVercel = Boolean(process.env.VERCEL);
const forceMigrate = process.env.RUN_MIGRATE_ON_BUILD === "1";

if (onVercel || forceMigrate) {
  console.log("\n========== [build-production] prisma migrate deploy ==========\n");
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error(
      "[build-production] DATABASE_URL is missing or empty. Add it in Vercel → Settings → Environment Variables (Production)."
    );
    process.exit(1);
  }
  run("prisma migrate deploy", "npx", ["prisma", "migrate", "deploy"]);
}

console.log("\n========== [build-production] prisma generate ==========\n");
run("prisma generate", "node", ["scripts/prisma-generate.mjs"]);

console.log("\n========== [build-production] next build ==========\n");
run("next build", "npx", ["next", "build"]);

console.log("\n[build-production] All steps completed OK.\n");
