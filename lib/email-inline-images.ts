import { readFile } from "fs/promises";
import { basename, join, normalize, sep } from "path";
import { bundledMenuImage } from "@/lib/bundled-menu-images";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { sitePathFromPhotoUrl } from "@/lib/menu-photo-url";

export type MailInlineImage = {
  filename: string;
  content: Buffer;
  contentId: string;
  contentType: string;
};

function mimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function publicImagesDiskPath(sitePath: string): string | null {
  const posix = sitePath.replace(/\\/g, "/");
  if (!posix.startsWith("/images/") || posix.includes("..")) return null;
  const rel = posix.slice(1);
  const abs = normalize(join(process.cwd(), "public", rel));
  const root = normalize(join(process.cwd(), "public", "images")) + sep;
  if (!abs.startsWith(root) && abs !== root.slice(0, -1)) return null;
  return abs;
}

async function readDiskImage(sitePath: string): Promise<Buffer | null> {
  const disk = publicImagesDiskPath(sitePath);
  if (!disk) return null;
  try {
    return await readFile(disk);
  } catch {
    return null;
  }
}

async function fetchPublicImage(sitePath: string): Promise<Buffer | null> {
  const origin = getPublicSiteOrigin().replace(/\/$/, "");
  try {
    const res = await fetch(`${origin}${sitePath}`, { cache: "no-store" });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (type && !type.startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function loadPublicMenuImageForEmail(
  photoUrl: string
): Promise<Omit<MailInlineImage, "contentId"> | null> {
  const sitePath = sitePathFromPhotoUrl(photoUrl);
  if (!sitePath?.startsWith("/images/")) return null;
  const content =
    bundledMenuImage(sitePath) ??
    (await readDiskImage(sitePath)) ??
    (await fetchPublicImage(sitePath));
  if (!content?.length) return null;
  return {
    filename: basename(sitePath),
    content,
    contentType: mimeFromPath(sitePath),
  };
}

function stripUninlinedFoodPhotos(html: string): string {
  return html.replace(/<img\b[^>]*\bdata-mrk-photo="[^"]+"[^>]*>/gi, (tag) =>
    /src=["']cid:/i.test(tag) ? tag : ""
  );
}

/** Load menu photos once, then swap hosted URLs for cid: on each recipient’s HTML. */
export async function prepareInlineMenuPhotos(
  photos: { id: string; url: string | null }[]
): Promise<{
  inlineImages: MailInlineImage[];
  apply: (html: string) => string;
}> {
  const inlineImages: MailInlineImage[] = [];
  const pairs: { from: string; to: string }[] = [];
  const usedIds = new Set<string>();
  const usedUrls = new Set<string>();

  for (const photo of photos) {
    const url = photo.url?.trim();
    if (!url || usedUrls.has(url)) continue;
    const loaded = await loadPublicMenuImageForEmail(url);
    if (!loaded) continue;
    const contentId = `mrk-${photo.id.replace(/[^a-zA-Z0-9_-]/g, "")}`.slice(
      0,
      40
    );
    if (!contentId || usedIds.has(contentId)) continue;
    usedIds.add(contentId);
    usedUrls.add(url);
    pairs.push({ from: url, to: `cid:${contentId}` });
    inlineImages.push({ ...loaded, contentId });
  }

  return {
    inlineImages,
    apply(html: string) {
      let out = html;
      for (const pair of pairs) out = out.split(pair.from).join(pair.to);
      return stripUninlinedFoodPhotos(out);
    },
  };
}

/** Swap hosted photo URLs for cid: attachments so Gmail/Yahoo do not have to fetch the site. */
export async function inlineHostedPhotosInHtml(params: {
  html: string;
  photos: { id: string; url: string | null }[];
}): Promise<{ html: string; inlineImages: MailInlineImage[] }> {
  const prepared = await prepareInlineMenuPhotos(params.photos);
  return {
    html: prepared.apply(params.html),
    inlineImages: prepared.inlineImages,
  };
}
