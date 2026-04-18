/**
 * Vercel/CI: prisma generate + next build. Migrations during the Vercel build are opt-in
 * (`RUN_MIGRATE_ON_VERCEL=1` or `RUN_MIGRATE_ON_BUILD=1`) so a failed migrate does not
 * block deploy. Neon: set DIRECT_URL (direct, non-pooled) when DATABASE_URL uses *-pooler*;
 * migrate runs with DATABASE_URL temporarily set to DIRECT_URL for that step only.
 * On migrate failure, the script retries once after 15s (helps P1002 / lock contention).
 * Apply migrations from your machine: `npm run db:migrate` (loads .env.local).
 *
 * Local `npm run build`: does not migrate unless RUN_MIGRATE_ON_BUILD=1.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

/** Blocking sleep without extra deps (used between migrate retries). */
function sleepSync(ms) {
  const sab = new SharedArrayBuffer(4);
  const ia = new Int32Array(sab);
  Atomics.wait(ia, 0, 0, Math.min(ms, 2147483647));
}

function runMigrateDeployWithRetry(migrateEnv) {
  const env = { ...process.env, ...migrateEnv };
  const runOnce = () =>
    spawnSync("npx", ["prisma", "migrate", "deploy"], {
      stdio: "inherit",
      env,
      shell: true,
    });

  const first = runOnce();
  if (first.status === 0) return;

  console.warn(
    "\n[build-production] prisma migrate deploy failed (exit " +
      String(first.status ?? "?") +
      "). Retrying once after 15s (often clears P1002 / advisory lock contention or short Neon timeouts).\n"
  );
  sleepSync(15_000);

  const second = runOnce();
  if (second.status !== 0) {
    console.error("\n[build-production] FAILED at step: prisma migrate deploy\n");
    process.exit(second.status ?? 1);
  }
}

function run(label, command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
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
    const direct = process.env.DIRECT_URL?.trim();
    const urlLooksPooled = (u) =>
      /-pooler\./i.test(u) || /pooler\.neon\.tech/i.test(u);
    const looksPooled = urlLooksPooled(dbUrl);
    const directLooksPooled = direct ? urlLooksPooled(direct) : false;

    if (direct && directLooksPooled) {
      console.error(
        "\n[build-production] DIRECT_URL is set but still looks like a *pooled* Neon host (*-pooler*). " +
          "Prisma migrate must use the **direct** connection (Neon → Connect → select **Direct**, copy that URL). " +
          "The pooled URL in DATABASE_URL is fine for the app; only migrations need DIRECT_URL.\n"
      );
      process.exit(1);
    }

    if (looksPooled && !direct) {
      console.error(
        "\n[build-production] DATABASE_URL looks like a Neon pooler (*-pooler*). " +
          "`prisma migrate deploy` against the pooler often hits P1002 (advisory lock timeout). " +
          "Add DIRECT_URL in Vercel (Neon dashboard → Connect → **Direct** / non-pooled URL), " +
          "same in .env.local for `npm run db:migrate`. Migrations run with DATABASE_URL replaced by DIRECT_URL for that step only.\n"
      );
      process.exit(1);
    }
    const migrateEnv =
      direct && !directLooksPooled ? { DATABASE_URL: direct } : {};
    console.log("\n========== [build-production] prisma migrate deploy ==========\n");
    runMigrateDeployWithRetry(migrateEnv);
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
