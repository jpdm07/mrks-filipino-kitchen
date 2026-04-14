import type { MenuItemDTO } from "@/lib/menu-types";
import { SUGGESTION_OPTIONS } from "@/lib/config";
import { MENU_CATALOG } from "@/lib/menu-catalog";
import { LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN } from "@/lib/lumpia-cost-model";
import { FLAN_RETAIL_PER_RAMEKIN_USD } from "@/lib/flan-cost-model";

/** Used when Prisma native engine fails (e.g. Windows on ARM). */
export const FALLBACK_MENU: MenuItemDTO[] = MENU_CATALOG.map((m) => ({
  id: m.id,
  name: m.name,
  description: m.description,
  category: m.category,
  calories: m.calories,
  basePrice: m.basePrice,
  sizes: m.sizes.map((s) => ({ ...s })),
  photoUrl: m.photoUrl,
  isActive: true,
  soldOut: false,
  hasCooked: m.hasCooked,
  hasFrozen: m.hasFrozen,
  sortOrder: m.sortOrder,
  variantGroup: "variantGroup" in m ? m.variantGroup : null,
  variantShortLabel: "variantShortLabel" in m ? m.variantShortLabel : null,
  groupCardTitle: "groupCardTitle" in m ? m.groupCardTitle : null,
  groupServingBlurb: "groupServingBlurb" in m ? m.groupServingBlurb : null,
}));

/** Same ids as `prisma/seed.ts` poll rows so votes match when DB is available. */
export const FALLBACK_SUGGESTIONS = SUGGESTION_OPTIONS.map((option, i) => ({
  id: `poll-${i}`,
  option,
  count: 0,
  isCustom: false as const,
}));

export const FALLBACK_SAMPLE_PRICING = {
  lumpia: { ...LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN },
  quail: 2.49,
  flan: FLAN_RETAIL_PER_RAMEKIN_USD,
  pancit: 6.3,
};
