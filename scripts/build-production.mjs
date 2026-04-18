/**
 * Vercel/CI: prisma generate + next build. Migrations during the Vercel build are opt-in
 * (`RUN_MIGRATE_ON_VERCEL=1` or `RUN_MIGRATE_ON_BUILD=1`) so a failed migrate does not
 * block deploy. Apply migrations from your machine: `npm run db:migrate` with production DATABASE_URL.
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
const migrateOnVercel =
  process.env.RUN_MIGRATE_ON_VERCEL === "1" || process.env.RUN_MIGRATE_ON_BUILD === "1";
const skipMigrateDeploy =
  process.env.VERCEL_SKIP_MIGRATE_DEPLOY === "1" ||
  process.env.SKIP_PRISMA_MIGRATE_DEPLOY === "1";

if ((onVercel || forceMigrate) && !skipMigrateDeploy) {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.warn(
      "[build-production] DATABASE_URL is not visible during this build — skipping migrations.\n" +
        "  → Ensure DATABASE_URL exists in Vercel → Settings → Environment Variables (Production).\n" +
        "  → Then run: npm run db:migrate (production DATABASE_URL in .env.local)\n"
    );
  } else if (onVercel && !migrateOnVercel) {
    console.log(
      "\n[build-production] Vercel: skipping prisma migrate deploy by default (keeps deploys green).\n" +
        "  → Run migrations yourself: npm run db:migrate with production DATABASE_URL\n" +
        "  → Or set RUN_MIGRATE_ON_VERCEL=1 in Vercel env to migrate on each production build.\n"
    );
  } else {
    console.log("\n========== [build-production] prisma migrate deploy ==========\n");
    run("prisma migrate deploy", "npx", ["prisma", "migrate", "deploy"]);
  }
} else if (skipMigrateDeploy && (onVercel || forceMigrate)) {
  console.log(
    "\n[build-production] Skipping prisma migrate deploy (VERCEL_SKIP_MIGRATE_DEPLOY=1).\n"
  );
}

console.log("\n========== [build-production] prisma generate ==========\n");
run("prisma generate", "node", ["scripts/prisma-generate.mjs"]);

console.log("\n========== [build-production] next build ==========\n");
run("next build", "npx", ["next", "build"]);

console.log("\n[build-production] All steps completed OK.\n");
