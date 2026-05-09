/**
 * Admin kitchen recipes stored in Postgres — scalable batch formulas (JSON in DB).
 */

export type ScalableIngredientLine = {
  label: string;
  /** Numeric amount at `baseServings` (proportional scaling). Null = display-only / note row. */
  amount: number | null;
  /** Shown after the scaled number (e.g. "oz dry", "cups", "large onions, diced"). */
  unit: string;
  note?: string;
};

export type ScalableIngredientSection = {
  heading: string;
  lines: ScalableIngredientLine[];
};

export type KitchenRecipeIngredientsPayload = {
  sections: ScalableIngredientSection[];
};

export function scaleKitchenAmount(
  amount: number | null,
  baseServings: number,
  targetServings: number
): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  const base = Math.max(1, baseServings);
  const factor = targetServings / base;
  return amount * factor;
}

function fmtQty(n: number): string {
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 1000) / 1000;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

/** Build one display line at the requested serving count. */
export function formatScaledLine(
  line: ScalableIngredientLine,
  baseServings: number,
  targetServings: number
): string {
  const bits: string[] = [line.label.trim()];
  const scaled = scaleKitchenAmount(line.amount, baseServings, targetServings);
  if (scaled != null) {
    bits.push(`${fmtQty(scaled)} ${line.unit.trim()}`.trim());
  } else if (line.unit.trim()) {
    bits.push(line.unit.trim());
  }
  let s = bits.filter(Boolean).join(" — ");
  if (line.note?.trim()) {
    s += ` (${line.note.trim()})`;
  }
  return s;
}
