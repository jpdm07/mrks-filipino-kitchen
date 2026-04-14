import { prisma } from "@/lib/prisma";
import {
  ensureMenuSizes,
  parseMenuSizes,
  type MenuItemDTO,
} from "@/lib/menu-types";
import { safeDb } from "@/lib/safe-db";
import {
  catalogMenuItemsMissingFromDb,
  overlayPublicMenuItemFromCatalog,
} from "@/lib/menu-catalog-merge";
import { FALLBACK_MENU } from "@/lib/static-menu-fallback";

/** Full public menu list (same source as `/menu` and `/takeout-menu`). */
export async function getPublicMenuItems(): Promise<MenuItemDTO[]> {
  return safeDb(async () => {
    const rows = await prisma.menuItem.findMany({
      orderBy: { sortOrder: "asc" },
    });
    const mapped = rows.map((m): MenuItemDTO => {
      const o = overlayPublicMenuItemFromCatalog({
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        calories: m.calories,
        basePrice: m.basePrice,
        sizes: ensureMenuSizes(parseMenuSizes(m.sizes), m.basePrice),
        photoUrl: m.photoUrl,
        isActive: m.isActive,
        soldOut: m.soldOut,
        hasCooked: m.hasCooked,
        hasFrozen: m.hasFrozen,
        sortOrder: m.sortOrder,
        variantGroup: m.variantGroup ?? null,
        variantShortLabel: m.variantShortLabel ?? null,
        groupCardTitle: m.groupCardTitle ?? null,
        groupServingBlurb: m.groupServingBlurb ?? null,
      });
      return { ...o, sizes: ensureMenuSizes(o.sizes, o.basePrice) };
    });
    const ids = new Set(mapped.map((m) => m.id));
    const merged = [
      ...mapped,
      ...catalogMenuItemsMissingFromDb(ids).map((m) => ({
        ...m,
        sizes: ensureMenuSizes(m.sizes, m.basePrice),
      })),
    ].sort((a, b) => a.sortOrder - b.sortOrder);
    return merged;
  }, FALLBACK_MENU.map((m) => ({
    ...m,
    sizes: ensureMenuSizes(m.sizes, m.basePrice),
  })));
}
