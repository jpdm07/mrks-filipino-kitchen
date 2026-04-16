import type { MenuItemDTO } from "@/lib/menu-types";

/** Lowest list price among sizes (lumpia: min cooked/frozen per protein). */
function lumpiaCheapestListPriceUsd(v: MenuItemDTO): number {
  const nums = v.sizes
    .map((s) => Number(s.price))
    .filter((n) => Number.isFinite(n));
  if (nums.length) return Math.min(...nums);
  const n = Number(v.basePrice);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/**
 * Default variant for a grouped card. Lumpia defaults to the cheapest in-stock
 * protein (cooked dozen); other groups keep first available by sort order.
 */
export function defaultGroupedVariantId(variants: MenuItemDTO[]): string {
  if (!variants.length) return "";
  const sorted = [...variants].sort((a, b) => a.sortOrder - b.sortOrder);
  const inStock = sorted.filter((v) => !v.soldOut);
  const pickFrom = inStock.length ? inStock : sorted;
  if (sorted[0]?.variantGroup !== "lumpia") {
    return pickFrom[0]?.id ?? "";
  }
  let best = pickFrom[0];
  let bestP = lumpiaCheapestListPriceUsd(best);
  for (let i = 1; i < pickFrom.length; i++) {
    const v = pickFrom[i];
    const p = lumpiaCheapestListPriceUsd(v);
    if (p < bestP || (p === bestP && v.sortOrder < best.sortOrder)) {
      best = v;
      bestP = p;
    }
  }
  return best?.id ?? "";
}
