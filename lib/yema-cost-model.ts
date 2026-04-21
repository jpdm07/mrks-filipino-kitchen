/**
 * Yema — Filipino milk candy (soft balls). Internal economics only (never shown at checkout).
 * Retail is defined in `MENU_CATALOG`; COGS is a rough batch model for Sheets + earnings planner.
 */

export const YEMA_RETAIL_SINGLE_USD = 1.5;
export const YEMA_RETAIL_SIX_PACK_USD = 7;

/** Ingredient + wrap ~per finished piece (adjust if your batch math changes). */
export const YEMA_COGS_PER_PIECE_USD = 0.52;

/** Soft cap in Weekly Earnings Planner only (pieces); not a kitchen calendar limit. */
export const YEMA_PLANNER_WEEKLY_PIECES_CAP = 72;

export function yemaUnitCogsUsd(sizeLabel: string | null | undefined): number {
  const s = (sizeLabel ?? "").toLowerCase();
  if (s.includes("6 pieces") || s.includes("bundle")) {
    return Math.round(6 * YEMA_COGS_PER_PIECE_USD * 100) / 100;
  }
  return YEMA_COGS_PER_PIECE_USD;
}
