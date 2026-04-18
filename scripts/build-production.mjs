/**
 * Vercel/CI: prisma generate + next build.
 *
 * **Prisma migrate deploy never runs on Vercel** — avoids P1002 advisory lock timeouts on Neon
 * poolers and overlapping deploys. After you change `prisma/schema.prisma`, run locally:
 *   npm run db:migrate
 * with production `DATABASE_URL` + `DIRECT_URL` in `.env.local` (see Neon Connect → Direct).
 *
 * Local only: set `RUN_MIGRATE_ON_BUILD=1` to run `prisma migrate deploy` during `npm run build`.
 * Opt out of migrate on any machine: `VERCEL_SKIP_MIGRATE_DEPLOY=1` or `SKIP_PRISMA_MIGRATE_DEPLOY=1`.
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
const skipMigrateDeploy =
  process.env.VERCEL_SKIP_MIGRATE_DEPLOY === "1" ||
  process.env.SKIP_PRISMA_MIGRATE_DEPLOY === "1";

if (skipMigrateDeploy && (onVercel || forceMigrate)) {
  console.log(
    "\n[build-production] Skipping prisma migrate deploy (VERCEL_SKIP_MIGRATE_DEPLOY / SKIP_PRISMA_MIGRATE_DEPLOY).\n"
  );
} else if (onVercel) {
  console.log(
    "\n[build-production] Vercel: skipping prisma migrate deploy (not supported in CI — avoids Neon P1002 / lock issues).\n" +
      "  → Schema changes: run `npm run db:migrate` locally with production DATABASE_URL + DIRECT_URL in .env.local.\n" +
      "  → You can remove RUN_MIGRATE_ON_VERCEL from Vercel env (it is ignored).\n"
  );
} else if (forceMigrate && !skipMigrateDeploy) {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.warn(
      "[build-production] DATABASE_URL is not set — skipping migrations.\n" +
        "  → Set DATABASE_URL (and DIRECT_URL if using a Neon pooler) then re-run, or run: npm run db:migrate\n"
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
          "Use Neon → Connect → **Direct** URL for DIRECT_URL.\n"
      );
      process.exit(1);
    }

    if (looksPooled && !direct) {
      console.error(
        "\n[build-production] DATABASE_URL looks like a Neon pooler. " +
          "Add DIRECT_URL (direct / non-pooled) for prisma migrate deploy, or run db:migrate with DIRECT_URL in env.\n"
      );
      process.exit(1);
    }
    const migrateEnv =
      direct && !directLooksPooled ? { DATABASE_URL: direct } : {};
    console.log("\n========== [build-production] prisma migrate deploy (local RUN_MIGRATE_ON_BUILD=1) ==========\n");
    runMigrateDeployWithRetry(migrateEnv);
  }
}

console.log("\n========== [build-production] prisma generate ==========\n");
run("prisma generate", "node", ["scripts/prisma-generate.mjs"]);

console.log("\n========== [build-production] next build ==========\n");
run("next build", "npx", ["next", "build"]);

console.log("\n[build-production] All steps completed OK.\n");
