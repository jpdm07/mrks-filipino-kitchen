import { MENU_CATALOG } from "./menu-catalog";
import type { MenuItemDTO } from "./menu-types";

type CatalogRow = (typeof MENU_CATALOG)[number];

function catalogRowToDtoBase(c: CatalogRow): Omit<MenuItemDTO, "isActive" | "soldOut"> {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    calories: c.calories,
    basePrice: c.basePrice,
    sizes: c.sizes.map((s) => ({ ...s })),
    photoUrl: c.photoUrl,
    hasCooked: c.hasCooked,
    hasFrozen: c.hasFrozen,
    sortOrder: c.sortOrder,
    variantGroup: "variantGroup" in c ? c.variantGroup : null,
    variantShortLabel: "variantShortLabel" in c ? c.variantShortLabel : null,
    groupCardTitle: "groupCardTitle" in c ? c.groupCardTitle : null,
    groupServingBlurb: "groupServingBlurb" in c ? c.groupServingBlurb : null,
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
