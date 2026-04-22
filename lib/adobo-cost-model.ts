/**
 * Chicken or Pork Adobo — retail and recipe-aligned loaded COGS by protein + size.
 * Used by `menu-catalog` list prices, `getUnitCost` → Google Sheets, and admin recipe margins.
 */

export const ADOBO_RETAIL_USD = {
  plate: 11.99,
  party: 65,
} as const;

/**
 * Per-unit recipe COGS (same retail for both proteins; costs differ by protein).
 * Party tray: 8–10 servings (recipe economics).
 */
export const ADOBO_RECIPE_COGS_USD = {
  plate: { chicken: 3.1, pork: 3.82 },
  party: { chicken: 19.2, pork: 26.7 },
} as const;

/** One-line takeout/print blurb (matches `/takeout-menu` spec). */
export const ADOBO_PRINT_TAKEOUT_SUBLINE = `from $11.99 — Chicken or Pork · Plate $11.99 · Party Tray (8–10) $${ADOBO_RETAIL_USD.party.toFixed(2)}`;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function adoboCogs(
  protein: "chicken" | "pork",
  sizeIsParty: boolean
): number {
  const b = sizeIsParty
    ? ADOBO_RECIPE_COGS_USD.party[protein]
    : ADOBO_RECIPE_COGS_USD.plate[protein];
  return round2(b);
}

/**
 * `size` should be the order `size` field (e.g. "Pork, Plate" or "Chicken, Party Tray (8–10)").
 * `adoboProtein` is set on new orders; when missing, infer pork only if the size string
 * looks like the new format and starts with "Pork", else default to chicken (legacy
 * "Chicken Adobo" lines).
 */
export function adoboCogsForOrderLine(
  name: string,
  size: string | null | undefined,
  adoboProtein?: "chicken" | "pork"
): number | null {
  if (!/adobo/i.test(name)) return null;
  const sz = `${size ?? ""}`.toLowerCase();
  const sizeIsParty = /\bparty|8[-–]10|8~10|8-10\s*serv/i.test(sz);
  if (adoboProtein) {
    return adoboCogs(adoboProtein, sizeIsParty);
  }
  if (/^pork\b/i.test(`${size ?? ""}`.trim())) {
    return adoboCogs("pork", sizeIsParty);
  }
  return adoboCogs("chicken", sizeIsParty);
}

/**
 * Haystack-only helper (legacy). Defaults to **chicken** COGS; cannot detect pork.
 * Prefer `adoboCogsForOrderLine` with the real `name` + `size` + `adoboProtein`.
 */
export function adoboUnitCostFromHaystack(h: string): number | null {
  if (!h.includes("adobo")) return null;
  const party = h.includes("party");
  return adoboCogs("chicken", party);
}
