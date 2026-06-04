/**
 * Polvoron — Filipino milk shortbread crumbs (wrapped pieces / 6-pc bundle).
 * Internal economics for Google Sheets payloads, Finances math, and the Weekly Earnings Planner.
 * Public list prices: `MENU_CATALOG` row `seed-14` — keep retail constants here in sync with that row.
 */

export const POLVORON_RETAIL_CLASSIC_PIECE_USD = 1.5;
export const POLVORON_RETAIL_SPECIALTY_PIECE_USD = 1.75;
export const POLVORON_RETAIL_BUNDLE_6_USD = 10;

/**
 * Ingredient + wrap — classic piece (toasted flour, milk powder, sugar, butter).
 * Tune when your batch yield or supplier costs change.
 */
export const POLVORON_COGS_CLASSIC_PIECE_USD = 0.38;

/** Ube or cookies & cream — slightly higher mix-in cost vs classic. */
export const POLVORON_COGS_SPECIALTY_PIECE_USD = 0.44;

/**
 * One cart line = one 6-piece bundle (any flavor mix). Not 6× single-piece COGS
 * (bundle packaging + typical mix); adjust if your batch card differs.
 */
export const POLVORON_COGS_BUNDLE_6_USD = 2.65;

/** Soft cap in Weekly Earnings Planner only (individual pieces, all flavors combined). */
export const POLVORON_PLANNER_WEEKLY_PIECES_CAP = 120;

/** Planner cap for 6-pc bundle lines (separate from piece cap). */
export const POLVORON_PLANNER_WEEKLY_BUNDLES_CAP = 40;

function normSizeLabel(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/\u2013/g, "-");
}

/**
 * Unit COGS for one order line: per piece (classic or specialty) or one 6-pc bundle.
 * Uses the cart `size` label (same strings as `MENU_CATALOG` size labels).
 */
export function polvoronUnitCogsUsd(sizeLabel: string | null | undefined): number {
  const h = normSizeLabel(sizeLabel);
  if (h.includes("mix") && (h.includes("6") || h.includes("six"))) {
    return POLVORON_COGS_BUNDLE_6_USD;
  }
  if (h.includes("ube")) return POLVORON_COGS_SPECIALTY_PIECE_USD;
  if (h.includes("cookies")) return POLVORON_COGS_SPECIALTY_PIECE_USD;
  if (h.includes("classic")) return POLVORON_COGS_CLASSIC_PIECE_USD;
  return POLVORON_COGS_CLASSIC_PIECE_USD;
}
