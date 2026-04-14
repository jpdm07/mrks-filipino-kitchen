/**
 * Caramel Flan (Leche Flan) — individual 5oz Findful silver aluminum ramekin + clear lid only.
 * Party / pan sizes removed. Internal economics only (never shown at checkout).
 *
 * Findful 40-pack $8.99 → ~$0.225/unit; modeled as $0.23.
 * Labor: 0.75 hr total per 8-ramekin batch × $15/hr → $1.41 per ramekin.
 * Cool completely before snapping the clear lid on — lid is not heat-resistant.
 * No dip cup, foil cover, or gallon freezer bag.
 */

export const FLAN_RETAIL_PER_RAMEKIN_USD = 3.5;

export const FLAN_COGS_MODEL_USD = {
  ingredientsPerRamekin: 0.95,
  laborPerRamekin: 1.41,
  ramekinAndClearLidPerUnit: 0.23,
  toGoBagPerOrder: 0.09,
  napkinPerOrder: 0.03,
} as const;

export const FLAN_TRUE_COST_PER_RAMEKIN_USD = 2.71;
export const FLAN_PROFIT_PER_RAMEKIN_USD = 0.79;
export const FLAN_MARGIN_PCT = 22.57;

export function flanTrueCostPerRamekinUsd(): number {
  const m = FLAN_COGS_MODEL_USD;
  return (
    m.ingredientsPerRamekin +
    m.laborPerRamekin +
    m.ramekinAndClearLidPerUnit +
    m.toGoBagPerOrder +
    m.napkinPerOrder
  );
}
