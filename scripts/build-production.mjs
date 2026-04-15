/**
 * Vercel/CI: optionally apply migrations, then generate client, then `next build`.
 * Local: skips `migrate deploy` unless RUN_MIGRATE_ON_BUILD=1.
 *
 * If DATABASE_URL is missing during the Vercel *build*, we skip migrations so the
 * deploy can still finish — run `npx prisma migrate deploy` from your PC (same URL).
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
/** Set in Vercel → Environment Variables if migrate fails the deploy (drift, timeout). Run `npx prisma migrate deploy` locally or in CI instead. */
const skipMigrateDeploy =
  process.env.VERCEL_SKIP_MIGRATE_DEPLOY === "1" ||
  process.env.SKIP_PRISMA_MIGRATE_DEPLOY === "1";

if ((onVercel || forceMigrate) && !skipMigrateDeploy) {
  console.log("\n========== [build-production] prisma migrate deploy ==========\n");
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.warn(
      "[build-production] DATABASE_URL is not visible during this build — skipping migrations.\n" +
        "  → Ensure DATABASE_URL exists in Vercel → Settings → Environment Variables (Production).\n" +
        "  → Then run from your computer (with the same URL in .env.local):\n" +
        "       npx prisma migrate deploy && npx prisma db seed\n"
    );
  } else {
    run("prisma migrate deploy", "npx", ["prisma", "migrate", "deploy"]);
  }
} else if (skipMigrateDeploy && (onVercel || forceMigrate)) {
  console.log(
    "\n[build-production] Skipping prisma migrate deploy (VERCEL_SKIP_MIGRATE_DEPLOY=1). Apply migrations manually when needed.\n"
  );
}

console.log("\n========== [build-production] prisma generate ==========\n");
run("prisma generate", "node", ["scripts/prisma-generate.mjs"]);

console.log("\n========== [build-production] next build ==========\n");
run("next build", "npx", ["next", "build"]);

console.log("\n[build-production] All steps completed OK.\n");
