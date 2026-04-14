import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMenuSizes, parseMenuSizes } from "@/lib/menu-types";
import { safeDb } from "@/lib/safe-db";
import {
  catalogMenuItemsMissingFromDb,
  overlayPublicMenuItemFromCatalog,
} from "@/lib/menu-catalog-merge";
import { FALLBACK_MENU } from "@/lib/static-menu-fallback";

export async function GET() {
  const dto = await safeDb(async () => {
    const items = await prisma.menuItem.findMany({
      orderBy: { sortOrder: "asc" },
    });
    const mapped = items.map((m) => {
      const dto = overlayPublicMenuItemFromCatalog({
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
      return {
        ...dto,
        sizes: ensureMenuSizes(dto.sizes, dto.basePrice),
        stockNotes: m.stockNotes,
      };
    });
    const ids = new Set(mapped.map((m) => m.id));
    const merged = [
      ...mapped,
      ...catalogMenuItemsMissingFromDb(ids).map((m) => ({
        ...m,
        sizes: ensureMenuSizes(m.sizes, m.basePrice),
        stockNotes: null as string | null,
      })),
    ].sort((a, b) => a.sortOrder - b.sortOrder);
    return merged;
  }, FALLBACK_MENU.map((m) => ({ ...m, stockNotes: null as string | null })));

  return NextResponse.json({ items: dto });
}
