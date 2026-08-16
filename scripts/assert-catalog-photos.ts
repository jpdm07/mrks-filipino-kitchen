import { existsSync } from "node:fs";
import { join } from "node:path";
import { allRequiredCatalogPhotoPaths } from "../lib/menu-photo-url";

const missing: string[] = [];
for (const sitePath of allRequiredCatalogPhotoPaths()) {
  const disk = join(process.cwd(), "public", sitePath.replace(/^\//, ""));
  if (!existsSync(disk)) missing.push(`${sitePath} → ${disk}`);
}

if (missing.length) {
  console.error(
    "[assert-catalog-photos] Menu photo files are missing. Add them under public/images/ before deploy:\n" +
      missing.map((m) => `  - ${m}`).join("\n")
  );
  process.exit(1);
}

console.log(
  `[assert-catalog-photos] OK — ${allRequiredCatalogPhotoPaths().length} catalog photos on disk.`
);
