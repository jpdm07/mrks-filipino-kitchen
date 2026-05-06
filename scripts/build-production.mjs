/**
 * Vercel/CI: prisma generate + next build.
 *
 * By default, **prisma migrate deploy does not run on Vercel** (avoids P1002 advisory lock timeouts on Neon).
 *
 * Apply migrations to production:
 * - **Recommended once:** set `VERCEL_RUN_MIGRATE_DEPLOY=1` on Vercel (with `DATABASE_URL` + non-pooled `DIRECT_URL`)
 *   and redeploy so `migrate deploy` runs during build; remove the flag after migrations catch up, or leave it on.
 * - **Or** locally: put Production `DATABASE_URL` + `DIRECT_URL` in `.env.local`, then `npm run db:migrate`.
 *
 * Local: `RUN_MIGRATE_ON_BUILD=1` runs migrate during `npm run build` (same pooler rules).
 * Opt out anywhere: `VERCEL_SKIP_MIGRATE_DEPLOY=1` or `SKIP_PRISMA_MIGRATE_DEPLOY=1`.
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
const skipMigrateDeploy =
  process.env.VERCEL_SKIP_MIGRATE_DEPLOY === "1" ||
  process.env.SKIP_PRISMA_MIGRATE_DEPLOY === "1";
const runMigrateOnLocalBuild =
  !skipMigrateDeploy && !onVercel && process.env.RUN_MIGRATE_ON_BUILD === "1";
const runMigrateOnVercel =
  !skipMigrateDeploy && onVercel && process.env.VERCEL_RUN_MIGRATE_DEPLOY === "1";
const runMigrate = runMigrateOnLocalBuild || runMigrateOnVercel;

if (
  skipMigrateDeploy &&
  (process.env.RUN_MIGRATE_ON_BUILD === "1" ||
    process.env.VERCEL_RUN_MIGRATE_DEPLOY === "1")
) {
  console.log(
    "\n[build-production] Skipping prisma migrate deploy (VERCEL_SKIP_MIGRATE_DEPLOY / SKIP_PRISMA_MIGRATE_DEPLOY).\n"
  );
} else if (runMigrate) {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.warn(
      "[build-production] DATABASE_URL is not set — skipping migrations.\n" +
        "  → Set DATABASE_URL (+ DIRECT_URL if Neon pooler) on Vercel, or run: npm run db:migrate locally.\n"
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
      if (runMigrateOnVercel) {
        console.warn(
          "[build-production] Vercel: skipping migrate deploy this build so the site can deploy — fix DIRECT_URL, then redeploy or run npm run db:migrate locally.\n"
        );
      } else {
        process.exit(1);
      }
    } else if (looksPooled && !direct) {
      console.error(
        "\n[build-production] DATABASE_URL looks like a Neon pooler. " +
          "Add DIRECT_URL (direct / non-pooled) for prisma migrate deploy, or run db:migrate with DIRECT_URL in env.\n"
      );
      if (runMigrateOnVercel) {
        console.warn(
          "[build-production] Vercel: skipping migrate deploy this build so the site can deploy — add DIRECT_URL in Vercel env, or run npm run db:migrate locally.\n"
        );
      } else {
        process.exit(1);
      }
    } else {
      const migrateEnv =
        direct && !directLooksPooled ? { DATABASE_URL: direct } : {};
      const label = runMigrateOnVercel
        ? "Vercel VERCEL_RUN_MIGRATE_DEPLOY=1"
        : "local RUN_MIGRATE_ON_BUILD=1";
      console.log(
        `\n========== [build-production] prisma migrate deploy (${label}) ==========\n`
      );
      runMigrateDeployWithRetry(migrateEnv);
    }
  }
} else if (onVercel) {
  console.log(
    "\n[build-production] Vercel: skipping prisma migrate deploy by default (Neon P1002 / lock safety).\n" +
      "  → One-time or ongoing: set env VERCEL_RUN_MIGRATE_DEPLOY=1 (and DIRECT_URL if DATABASE_URL is pooled), then redeploy.\n" +
      "  → Or run `npm run db:migrate` locally with Production DATABASE_URL + DIRECT_URL in .env.local.\n"
  );
}

console.log("\n========== [build-production] prisma generate ==========\n");
run("prisma generate", "node", ["scripts/prisma-generate.mjs"]);

console.log("\n========== [build-production] next build ==========\n");
run("next build", "npx", ["next", "build"]);

console.log("\n[build-production] All steps completed OK.\n");
