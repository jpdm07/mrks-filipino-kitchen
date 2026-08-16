import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Git-tracked menu photos loaded from disk with static paths so Vercel
 * bundles them into the email API. Keys are site paths (`/images/…`).
 */
function fromPublicImages(filename: string): Buffer {
  return readFileSync(join(process.cwd(), "public", "images", filename));
}

const BUNDLED: Record<string, Buffer> = {
  "/images/lumpia.jpg": fromPublicImages("lumpia.jpg"),
  "/images/lumpia.png": fromPublicImages("lumpia.png"),
  "/images/pancit.jpg": fromPublicImages("pancit.jpg"),
  "/images/pancit1.jpeg": fromPublicImages("pancit1.jpeg"),
  "/images/flan.jpg": fromPublicImages("flan.jpg"),
  "/images/yema.jpg": fromPublicImages("yema.jpg"),
  "/images/quail-eggs.jpg": fromPublicImages("quail-eggs.jpg"),
  "/images/tocino.jpg": fromPublicImages("tocino.jpg"),
  "/images/chickenadobo.jpeg": fromPublicImages("chickenadobo.jpeg"),
  "/images/polvoron.jpeg": fromPublicImages("polvoron.jpeg"),
};

export function bundledMenuImage(sitePath: string): Buffer | null {
  const key = (sitePath.split("?")[0] ?? sitePath).trim();
  const buf = BUNDLED[key];
  return buf?.length ? buf : null;
}

export function bundledMenuImageSitePaths(): string[] {
  return Object.keys(BUNDLED);
}
