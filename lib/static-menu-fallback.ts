import type { MenuItemDTO } from "@/lib/menu-types";
import { SUGGESTION_OPTIONS } from "@/lib/config";
import { sampleCartPricesFromMenuCatalog } from "@/lib/sample-cart-pricing";
import { menuCatalogAsPublicDtos } from "@/lib/menu-catalog-merge";

/** Used when Prisma native engine fails (e.g. Windows on ARM). */
export const FALLBACK_MENU: MenuItemDTO[] = menuCatalogAsPublicDtos();

/** Same ids as `prisma/seed.ts` poll rows so votes match when DB is available. */
export const FALLBACK_SUGGESTIONS = SUGGESTION_OPTIONS.map((option, i) => ({
  id: `poll-${i}`,
  option,
  count: 0,
  isCustom: false as const,
}));

export const FALLBACK_SAMPLE_PRICING = sampleCartPricesFromMenuCatalog();
