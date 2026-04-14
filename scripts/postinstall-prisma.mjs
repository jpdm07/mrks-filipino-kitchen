/**
 * Local `npm install`: run prisma generate so `@prisma/client` exists.
 * Vercel: skip — `VERCEL=1` during install and `vercel.json` already runs
 * `npx prisma generate` in buildCommand (avoids duplicate work / long installs).
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

if (process.env.VERCEL === "1") {
  console.log(
    "[postinstall] Skipping prisma generate on Vercel (build runs prisma generate)."
  );
  process.exit(0);
}

const result = spawnSync("node", ["scripts/prisma-generate.mjs"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
