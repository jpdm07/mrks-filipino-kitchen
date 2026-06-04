import { MENU_CATALOG } from "./menu-catalog";
import { ensureMenuDescriptionIncludesDip } from "./menu-included-dip";
import type { MenuItemDTO } from "./menu-types";

type CatalogRow = (typeof MENU_CATALOG)[number];

export function catalogNullableString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function catalogRowToDtoBase(c: CatalogRow): Omit<MenuItemDTO, "isActive" | "soldOut"> {
  const gallery =
    "photoGalleryUrls" in c &&
    Array.isArray(c.photoGalleryUrls) &&
    c.photoGalleryUrls.length > 0
      ? c.photoGalleryUrls.map((u) => String(u).trim()).filter(Boolean)
      : [];
  return {
    id: c.id,
    name: c.name,
    description: ensureMenuDescriptionIncludesDip(c.id, c.description),
    category: c.category,
    calories: c.calories,
    basePrice: c.basePrice,
    sizes: c.sizes.map((s) => ({ ...s })),
    photoUrl: c.photoUrl,
    photoGalleryUrls: gallery,
    hasCooked: c.hasCooked,
    hasFrozen: c.hasFrozen,
    sortOrder: c.sortOrder,
    variantGroup:
      "variantGroup" in c ? catalogNullableString(c.variantGroup) : null,
    variantShortLabel:
      "variantShortLabel" in c
        ? catalogNullableString(c.variantShortLabel)
        : null,
    groupCardTitle:
      "groupCardTitle" in c ? catalogNullableString(c.groupCardTitle) : null,
    groupServingBlurb:
      "groupServingBlurb" in c
        ? catalogNullableString(c.groupServingBlurb)
        : null,
  };
}

/**
 * Public menu + API: prices, copy, photos, and grouping come from `MENU_CATALOG` so the site
 * matches code. DB still controls `isActive` and `soldOut` (and `stockNotes` on API).
 */
export function overlayPublicMenuItemFromCatalog(item: MenuItemDTO): MenuItemDTO {
  const c = MENU_CATALOG.find((m) => m.id === item.id);
  if (!c) return item;
  return {
    ...catalogRowToDtoBase(c),
    isActive: item.isActive,
    soldOut: item.soldOut,
  };
}

/**
 * Items defined in `MENU_CATALOG` but absent from Prisma (e.g. new dish before `db seed`).
 * Shown on /menu so the public menu matches code without requiring an immediate DB sync.
 */
export function catalogMenuItemsMissingFromDb(
  existingIds: Set<string>
): MenuItemDTO[] {
  return MENU_CATALOG.filter((m) => !existingIds.has(m.id)).map((m) => ({
    ...catalogRowToDtoBase(m),
    isActive: true,
    soldOut: false,
  }));
}

/** Public menu rows from `MENU_CATALOG` (e.g. DB-offline fallback). */
export function menuCatalogAsPublicDtos(
  flags: { isActive: boolean; soldOut: boolean } = {
    isActive: true,
    soldOut: false,
  }
): MenuItemDTO[] {
  return MENU_CATALOG.map((m) => ({
    ...catalogRowToDtoBase(m),
    isActive: flags.isActive,
    soldOut: flags.soldOut,
  }));
}
