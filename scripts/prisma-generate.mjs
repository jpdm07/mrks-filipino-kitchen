/**
 * Runs `prisma generate`. Wrapper exists so `postinstall` / `build` stay consistent;
 * `schema.prisma` uses `engineType = "binary"` so Windows avoids the Node-API DLL
 * that often fails with “not a valid Win32 application” on ARM or mixed setups.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

const result = spawnSync("npx", ["prisma", "generate", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
