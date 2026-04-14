/**
 * Push variables from .env.local to Vercel (CLI). Does not print secret values.
 *
 * Prerequisites:
 *   npx vercel link
 *   npx vercel login   (if needed)
 *
 * Usage:
 *   node scripts/sync-env-to-vercel.mjs              # production only
 *   node scripts/sync-env-to-vercel.mjs --preview  # production + preview
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parse } from "dotenv";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env.local");
const vercelDir = resolve(root, ".vercel");

if (!existsSync(envPath)) {
  console.error("Missing .env.local — create it from .env.example and fill values.");
  process.exit(1);
}

if (!existsSync(vercelDir)) {
  console.error("Not linked to Vercel. Run: npx vercel link");
  process.exit(1);
}

const withPreview = process.argv.includes("--preview");
const targets = withPreview ? ["production", "preview"] : ["production"];

const raw = readFileSync(envPath);
const parsed = parse(raw);

const keys = Object.keys(parsed).filter((k) => k && !k.startsWith("#"));
if (keys.length === 0) {
  console.error("No variables found in .env.local");
  process.exit(1);
}

console.log(`Syncing ${keys.length} variable(s) to: ${targets.join(", ")}`);
console.log("(values are not shown)\n");

for (const key of keys) {
  const value = parsed[key];
  if (value === undefined || value === "") {
    console.warn(`Skip (empty): ${key}`);
    continue;
  }

  const sensitive = !key.startsWith("NEXT_PUBLIC_");

  for (const envName of targets) {
    const args = [
      "vercel",
      "env",
      "add",
      key,
      envName,
      "--yes",
      "--force",
    ];
    if (sensitive) args.push("--sensitive");

    const result = spawnSync("npx", args, {
      cwd: root,
      shell: true,
      encoding: "utf-8",
      input: value.endsWith("\n") ? value : `${value}\n`,
      stdio: ["pipe", "inherit", "inherit"],
    });

    if (result.status !== 0) {
      console.error(`Failed: ${key} (${envName})`);
      process.exit(result.status ?? 1);
    }
    console.log(`OK ${key} → ${envName}`);
  }
}

console.log("\nDone. Redeploy on Vercel (Deployments → ⋯ → Redeploy).");
