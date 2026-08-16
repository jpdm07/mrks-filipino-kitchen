import { CATALOG_PHOTOS, MENU_CATALOG } from "@/lib/menu-catalog";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

/**
 * Old public files that were renamed. DB rows, carts, and emails may still
 * point at the previous path after the file was removed from `public/images/`.
 */
const PHOTO_PATH_ALIASES: Record<string, string> = {
  "/images/lumpia.png": "/images/lumpia.jpg",
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

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
  if (!path) {
    const raw = photo?.trim() ?? "";
    if (/^https:\/\//i.test(raw)) return raw;
    return null;
  }
  if (path.startsWith("/uploads/")) return null;
  return applyPhotoAliases(path);
}

function rewriteHostedSitePath(url: URL, origin: string): string | null {
  const host = url.hostname.toLowerCase();
  const path = applyPhotoAliases(url.pathname);
  if (path.startsWith("/uploads/")) return null;
  if (
    LOCAL_HOSTS.has(host) ||
    host === "mrkskitchen.com" ||
    host === "www.mrkskitchen.com" ||
    host.endsWith(".vercel.app")
  ) {
    return `${origin}${path}${url.search}${url.search ? "&" : "?"}v=2`;
  }
  return null;
}

/**
 * Absolute https URL for HTML emails. Email clients cannot load `/images/…`
 * relative paths, and they 404 on deleted files still stored in Prisma.
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
  if (catalogPath) {
    const path = catalogPath.startsWith("http")
      ? catalogPath
      : `${origin}${catalogPath}`;
    return `${path}${path.includes("?") ? "&" : "?"}v=2`;
  }

  const raw = opts.photoUrl?.trim() ?? "";
  if (!raw || /^(blob:|data:)/i.test(raw)) return null;

  if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
    try {
      const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
      const rewritten = rewriteHostedSitePath(u, origin);
      if (rewritten) return rewritten;
      if (u.protocol === "https:") return raw;
      return null;
    } catch {
      return null;
    }
  }

  const path = sitePathFromPhotoUrl(raw);
  if (!path || path.startsWith("/uploads/")) return null;
  return `${origin}${applyPhotoAliases(path)}?v=2`;
}
