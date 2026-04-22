import { FLAN_RETAIL_PER_RAMEKIN_USD } from "./flan-cost-model";
import {
  LUMPIA_RETAIL_TIERS_USD,
  type LumpiaProtein,
} from "./lumpia-cost-model";
import { MENU_CATALOG } from "./menu-catalog";
import {
  type Recipe,
  type RecipeVariant,
  batchCostForLumpiaVariant,
} from "./recipes";

export type TierLabel = "1 Dozen" | "2 Dozen" | "Party Tray (50 pcs)";

type LumpiaCatalogRow = (typeof MENU_CATALOG)[number];

const PROTEIN_BY_LABEL: Record<string, LumpiaProtein> = {
  Beef: "beef",
  Pork: "pork",
  Turkey: "turkey",
  beef: "beef",
  pork: "pork",
  turkey: "turkey",
};

function getLumpiaCatalogItem(protein: LumpiaProtein) {
  const m: Record<LumpiaProtein, string> = {
    beef: "seed-1",
    pork: "seed-2",
    turkey: "seed-3",
  };
  const id = m[protein];
  return MENU_CATALOG.find((c): c is LumpiaCatalogRow => c.id === id) ?? null;
}

/**
 * 50-pc party tray uses the full batch recipe cost. 1- and 2-dozen tiers prorate
 * units from the same 50-pc batch COGS in `recipes` (cooked and frozen list prices match per tier).
 */
function lumpiaTierEconomics(
  batchCost: number,
  pieces: 12 | 24 | 50
): { cost: number; key: "dz1" | "dz2" | "party50" } {
  if (pieces === 50) {
    return { cost: batchCost, key: "party50" };
  }
  if (pieces === 24) {
    return { cost: (batchCost * 24) / 50, key: "dz2" };
  }
  return { cost: (batchCost * 12) / 50, key: "dz1" };
}

function formatUsd(n: number) {
  return n.toFixed(2);
}

function formatPct(n: number) {
  return `${n.toFixed(0)}%`;
}

export type LumpiaMarginRow = {
  id: string;
  protein: LumpiaProtein;
  label: string;
  tier: TierLabel;
  cost: number;
  sell: number;
  profit: number;
  marginPct: number;
  oneLine: string;
};

export function lumpiaMarginDisplayRows(
  r: Recipe,
  variants: RecipeVariant[]
): LumpiaMarginRow[] {
  const rows: LumpiaMarginRow[] = [];
  for (const v of variants) {
    const p = PROTEIN_BY_LABEL[v.label];
    if (!p) continue;
    const batch = batchCostForLumpiaVariant(r, v);
    const t = LUMPIA_RETAIL_TIERS_USD[p];
    for (const def of [
      { pieces: 12 as const, displayTier: "1 Dozen" as const, key: "dz1" as const },
      { pieces: 24 as const, displayTier: "2 Dozen" as const, key: "dz2" as const },
      { pieces: 50 as const, displayTier: "Party Tray" as const, key: "party50" as const },
    ]) {
      const { cost, key } = lumpiaTierEconomics(batch, def.pieces);
      const sell = t[key];
      const profit = sell - cost;
      const marginPct = sell > 0 ? (100 * profit) / sell : 0;
      const catalog = getLumpiaCatalogItem(p);
      const menuName = catalog?.name?.replace(/^Lumpia — /, "") ?? v.label;
      const tier: TierLabel =
        def.pieces === 12
          ? "1 Dozen"
          : def.pieces === 24
            ? "2 Dozen"
            : "Party Tray (50 pcs)";
      rows.push({
        id: `${p}-${tier}`,
        protein: p,
        label: menuName,
        tier,
        cost,
        sell,
        profit,
        marginPct,
        oneLine: `Lumpia (${menuName}, ${def.displayTier}): cost $${formatUsd(
          cost
        )}, sell $${formatUsd(sell)}, profit $${formatUsd(
          profit
        )} (${formatPct(marginPct)} margin)`,
      });
    }
  }
  return rows;
}

export function flanMarginDisplayRows(
  r: Recipe
): { oneLine: string; cost: number; sell: number; profit: number; marginPct: number; ramekinCount: number; label: string }[] {
  const out: {
    oneLine: string;
    cost: number;
    sell: number;
    profit: number;
    marginPct: number;
    ramekinCount: number;
    label: string;
  }[] = [];
  if (!r.scaling?.length) {
    return out;
  }
  const perR = FLAN_RETAIL_PER_RAMEKIN_USD;
  for (const s of r.scaling) {
    const sell = perR * s.yieldUnits;
    const { totalCost: cost } = s;
    const profit = sell - cost;
    const marginPct = sell > 0 ? (100 * profit) / sell : 0;
    const label = `${s.multiplier}× batch (${s.yieldUnits} ramekins, menu $${perR} ea.)`;
    out.push({
      label,
      ramekinCount: s.yieldUnits,
      cost,
      sell,
      profit,
      marginPct,
      oneLine: `Caramel flan: cost $${formatUsd(
        cost
      )} (${s.yieldUnits} @ recipe), sell $${formatUsd(
        sell
      )} @ $${formatUsd(perR)}/ramekin, profit $${formatUsd(
        profit
      )} (${formatPct(marginPct)} margin)`,
    });
  }
  return out;
}

export function listRecipeBaseCostLabel(r: Recipe): string {
  if (r.id === "lumpia" && r.variants?.length) {
    const costs = r.variants
      .map((v) => v.totalCostOverride)
      .filter((c): c is number => c != null);
    if (costs.length) {
      const lo = Math.min(...costs);
      const hi = Math.max(...costs);
      if (lo === hi) return `$${lo.toFixed(2)} (batch)`;
      return `$${lo.toFixed(2)} – $${hi.toFixed(2)} (per batch, by protein)`;
    }
  }
  if (r.id === "leche-flan" && r.scaling?.[0]) {
    return `$${r.scaling[0].totalCost.toFixed(2)} (1×, ${r.yieldDescription})`;
  }
  return "—";
}
