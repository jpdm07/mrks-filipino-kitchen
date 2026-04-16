/**
 * Vercel: prisma migrate deploy + generate + next build.
 * When VERCEL=1 and DATABASE_URL is set, migrations run automatically (schema stays in sync).
 * Opt out with VERCEL_SKIP_MIGRATE_DEPLOY=1 if a bad migration would block deploy.
 *
 * Local `npm run build`: does not migrate unless RUN_MIGRATE_ON_BUILD=1.
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
const skipMigrateDeploy =
  process.env.VERCEL_SKIP_MIGRATE_DEPLOY === "1" ||
  process.env.SKIP_PRISMA_MIGRATE_DEPLOY === "1";

const dbUrl = process.env.DATABASE_URL?.trim();

/** Vercel production builds: migrate when DATABASE_URL is present (no RUN_MIGRATE_ON_VERCEL flag). */
const migrateNow =
  !skipMigrateDeploy && Boolean(dbUrl) && (onVercel || forceMigrate);

if (migrateNow) {
  console.log("\n========== [build-production] prisma migrate deploy ==========\n");
  run("prisma migrate deploy", "npx", ["prisma", "migrate", "deploy"]);
} else if (onVercel && !skipMigrateDeploy && !dbUrl) {
  console.warn(
    "[build-production] DATABASE_URL is not visible during this build — skipping migrations.\n" +
      "  → Add DATABASE_URL in Vercel → Settings → Environment Variables (Production).\n" +
      "  → Or run locally: npm run db:migrate\n"
  );
} else if (skipMigrateDeploy && onVercel) {
  console.log(
    "\n[build-production] Skipping prisma migrate deploy (VERCEL_SKIP_MIGRATE_DEPLOY=1).\n"
  );
}

console.log("\n========== [build-production] prisma generate ==========\n");
run("prisma generate", "node", ["scripts/prisma-generate.mjs"]);

console.log("\n========== [build-production] next build ==========\n");
run("next build", "npx", ["next", "build"]);

console.log("\n[build-production] All steps completed OK.\n");
