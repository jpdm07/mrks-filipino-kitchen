/**
 * Chicken adobo retail + modeled loaded COGS (protein, rice, egg, sauce, packaging, labor slice).
 * Used by `menu-catalog` list prices and `getUnitCost` → Google Sheets `estimatedProfit`.
 */

export const ADOBO_RETAIL_USD = {
  plate: 11.99,
  party: 55,
} as const;

/** Loaded COGS per unit — tuned vs. retail for Sheets margin lines. */
export const ADOBO_UNIT_COGS_USD = {
  /** Plate: 1 drumstick + 1 thigh, rice, egg, sauce, 3-comp foam. */
  plate: 5.85,
  party: 28.5,
} as const;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Match order line `name` + `size` from cart / DB. */
export function adoboUnitCostFromHaystack(h: string): number | null {
  if (!h.includes("adobo")) return null;
  if (h.includes("party")) return round2(ADOBO_UNIT_COGS_USD.party);
  return round2(ADOBO_UNIT_COGS_USD.plate);
}
