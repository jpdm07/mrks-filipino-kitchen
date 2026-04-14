/**
 * Tocino retail + modeled loaded COGS (ingredients, labor, packaging, dip allocation).
 * Used by `menu-catalog` list prices and `getUnitCost` → Google Sheets `estimatedProfit`.
 *
 * Cooked plate includes rice, egg, veg, foam, and dipping sauce in COGS.
 * Frozen line is a 12 oz retail pack (not 1 lb).
 */

export const TOCINO_RETAIL_USD = {
  cookedPlate: 11.99,
  frozen12oz: 9.99,
} as const;

/**
 * Loaded COGS per unit — tuned vs. retail so Sheets margin lines stay in a normal range
 * after the competitive price update.
 */
export const TOCINO_UNIT_COGS_USD = {
  cookedPlatePork: 5.5,
  cookedPlateChicken: 5.35,
  frozen12ozPork: 4.85,
  frozen12ozChicken: 4.65,
} as const;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Match order line `name` + `size` text from cart / DB (same pattern as lumpia haystack). */
export function tocinoUnitCostFromHaystack(h: string): number | null {
  if (!h.includes("tocino")) return null;
  const frozen = h.includes("frozen");
  if (h.includes("pork")) {
    return round2(
      frozen
        ? TOCINO_UNIT_COGS_USD.frozen12ozPork
        : TOCINO_UNIT_COGS_USD.cookedPlatePork
    );
  }
  if (h.includes("chicken")) {
    return round2(
      frozen
        ? TOCINO_UNIT_COGS_USD.frozen12ozChicken
        : TOCINO_UNIT_COGS_USD.cookedPlateChicken
    );
  }
  return null;
}
