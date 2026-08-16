import { CATALOG_PHOTOS, MENU_CATALOG } from "@/lib/menu-catalog";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

/**
 * Old public files that were renamed. DB rows, carts, and emails may still
 * point at the previous path after the file was removed from `public/images/`.
 */
const PHOTO_PATH_ALIASES: Record<string, string> = {
  "/images/lumpia.png": "/images/lumpia.jpg",
  "/images/lumpia.jpeg": "/images/lumpia.jpg",
};

export function allRequiredCatalogPhotoPaths(): string[] {
  const set = new Set<string>();
  for (const v of Object.values(CATALOG_PHOTOS)) {
    if (typeof v === "string" && v.startsWith("/images/")) {
      set.add(applyPhotoAliases(v));
    }
  }
  for (const row of MENU_CATALOG) {
    if (row.photoUrl?.startsWith("/images/")) {
      set.add(applyPhotoAliases(row.photoUrl));
    }
    const extras =
      "photoGalleryUrls" in row && Array.isArray(row.photoGalleryUrls)
        ? row.photoGalleryUrls
        : [];
    for (const extra of extras) {
      if (typeof extra === "string" && extra.startsWith("/images/")) {
        set.add(applyPhotoAliases(extra));
      }
    }
  }
  for (const dest of Object.values(PHOTO_PATH_ALIASES)) set.add(dest);
  return [...set].sort();
}

function applyPhotoAliases(path: string): string {
  const bare = path.split("?")[0] ?? path;
  return PHOTO_PATH_ALIASES[bare] ?? path;
}

/** Rewrite a stored path that still points at a renamed public file. */
export function canonicalStoredPhotoSrc(photo: string): string {
  const path = sitePathFromPhotoUrl(photo);
  if (!path) return photo.trim();
  return applyPhotoAliases(path);
}

/** Site-root path (`/images/…`) from a stored photo URL, or null if unusable. */
export function sitePathFromPhotoUrl(photo: string | null | undefined): string | null {
  const raw = photo?.trim();
  if (!raw) return null;
  if (/^(blob:|data:)/i.test(raw)) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
    try {
      const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
      return u.pathname || null;
    } catch {
      return null;
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function catalogPhotoPathForMenuItemId(
  id: string | null | undefined
): string | null {
  if (!id?.trim()) return null;
  const row = MENU_CATALOG.find((m) => m.id === id);
  const path = row?.photoUrl?.trim();
  return path ? applyPhotoAliases(path) : null;
}

export function catalogPhotoPathForName(
  name: string | null | undefined
): string | null {
  const n = name?.trim().toLowerCase() ?? "";
  if (!n) return null;
  const exact = MENU_CATALOG.find((m) => m.name.toLowerCase() === n);
  if (exact?.photoUrl?.trim()) return applyPhotoAliases(exact.photoUrl.trim());
  const compact = n.replace(/[^a-z0-9]+/g, "");
  const fuzzy = MENU_CATALOG.find(
    (m) => m.name.toLowerCase().replace(/[^a-z0-9]+/g, "") === compact
  );
  if (fuzzy?.photoUrl?.trim()) return applyPhotoAliases(fuzzy.photoUrl.trim());
  if (n.includes("lumpia")) return CATALOG_PHOTOS.lumpia;
  if (n.includes("pancit")) return CATALOG_PHOTOS.pancit;
  if (n.includes("tocino")) return CATALOG_PHOTOS.tocino;
  if (n.includes("adobo")) return CATALOG_PHOTOS.adobo;
  if (n.includes("polvoron")) return CATALOG_PHOTOS.polvoron;
  if (n.includes("flan") || n.includes("leche")) return CATALOG_PHOTOS.flan;
  if (n.includes("yema")) return CATALOG_PHOTOS.yema;
  if (n.includes("quail") || n.includes("kwek")) return CATALOG_PHOTOS.quail;
  return null;
}

/**
 * Path or URL safe for next/image on the site.
 * Prefers catalog photos (git-tracked files) over stale DB / upload paths.
 */
export function resolvePublicMenuPhotoSrc(
  photo: string | null | undefined,
  menuItemId?: string | null,
  displayName?: string | null
): string | null {
  const fromCatalog =
    catalogPhotoPathForMenuItemId(menuItemId) ??
    catalogPhotoPathForName(displayName);
  if (fromCatalog) return fromCatalog;

  const path = sitePathFromPhotoUrl(photo);
  if (!path || path.startsWith("/uploads/") || !path.startsWith("/images/")) {
    return null;
  }
  return applyPhotoAliases(path);
}

/**
 * Absolute https URL for HTML emails (admin preview only).
 * Sent mail inlines catalog files as cid: attachments — never a URL that can 404.
 * Only catalog photos are used; stale DB /uploads paths are ignored.
 */
export function resolveEmailMenuPhotoUrl(opts: {
  photoUrl?: string | null;
  menuItemId?: string | null;
  displayName?: string | null;
  origin?: string;
}): string | null {
  const origin = (opts.origin ?? getPublicSiteOrigin()).replace(/\/$/, "");
  const catalogPath =
    catalogPhotoPathForMenuItemId(opts.menuItemId) ??
    catalogPhotoPathForName(opts.displayName);
  if (!catalogPath || catalogPath.startsWith("http")) {
    return catalogPath?.startsWith("http") ? catalogPath : null;
  }
  return `${origin}${catalogPath}?v=2`;
}
