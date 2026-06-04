export type SizeOption = {
  key: string;
  label: string;
  price: number;
};

export type MenuItemDTO = {
  id: string;
  name: string;
  description: string;
  category: string;
  calories: string;
  basePrice: number;
  sizes: SizeOption[];
  photoUrl: string;
  /** Extra image URLs after `photoUrl` for menu card carousel (from `MENU_CATALOG`). */
  photoGalleryUrls: string[];
  isActive: boolean;
  soldOut: boolean;
  hasCooked: boolean;
  hasFrozen: boolean;
  sortOrder: number;
  variantGroup: string | null;
  variantShortLabel: string | null;
  groupCardTitle: string | null;
  groupServingBlurb: string | null;
};

export function parseMenuSizes(raw: string): SizeOption[] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is SizeOption =>
        typeof x === "object" &&
        x !== null &&
        "key" in x &&
        "label" in x &&
        "price" in x
    ) as SizeOption[];
  } catch {
    return [];
  }
}

/** If DB sizes JSON is missing or invalid, Add to Cart still needs one price line. */
export function ensureMenuSizes(
  sizes: SizeOption[],
  basePrice: number
): SizeOption[] {
  if (sizes.length > 0) return sizes;
  const p = Number(basePrice);
  const price = Number.isFinite(p) ? p : 0;
  return [{ key: "default", label: "Standard", price }];
}

/** Normalize optional gallery URLs from JSON or unknown input. */
export function normalizePhotoGalleryUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .map((u) => u.trim());
}

/** Unique ordered list for menu carousel: primary `photoUrl` first, then extras. */
export function menuItemDisplayPhotos(
  item: Pick<MenuItemDTO, "photoUrl" | "photoGalleryUrls">
): string[] {
  const primary = item.photoUrl.trim();
  const extras = normalizePhotoGalleryUrls(item.photoGalleryUrls);
  const seen = new Set<string>();
  const out: string[] = [];
  if (primary) {
    seen.add(primary);
    out.push(primary);
  }
  for (const u of extras) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}
