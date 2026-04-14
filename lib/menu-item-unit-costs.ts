/**
 * Internal unit COGS for Sheets (never shown on the public menu).
 * Values follow the master spec lookup tables + per-order napkin allocation in Sheets only.
 */

import type { OrderItemLine } from "./order-types";
import { LUMPIA_DOZEN_COGS_USD } from "./lumpia-cost-model";
import { adoboUnitCostFromHaystack } from "./adobo-cost-model";
import { tocinoUnitCostFromHaystack } from "./tocino-cost-model";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** 4-pc sample line COGS ≈ ⅓ of loaded dozen COGS for that protein (cooked). */
function lumpiaSample4pcCogsFromHaystack(h: string): number | null {
  if (!h.includes("sample") || !h.includes("lumpia")) return null;
  if (h.includes("beef")) {
    return round2((LUMPIA_DOZEN_COGS_USD.beef.cooked * 4) / 12);
  }
  if (h.includes("pork")) {
    return round2((LUMPIA_DOZEN_COGS_USD.pork.cooked * 4) / 12);
  }
  if (h.includes("turkey")) {
    return round2((LUMPIA_DOZEN_COGS_USD.turkey.cooked * 4) / 12);
  }
  return null;
}

/** Keeps Sheets lumpia COGS in lockstep with `lumpia-cost-model` batch math. */
function lumpiaDozenCogsFromHaystack(h: string): number | null {
  if (h.includes("sample")) return null;
  if (!h.includes("lumpia")) return null;
  const frozen = h.includes("frozen");
  if (h.includes("beef")) {
    return round2(
      frozen
        ? LUMPIA_DOZEN_COGS_USD.beef.frozen
        : LUMPIA_DOZEN_COGS_USD.beef.cooked
    );
  }
  if (h.includes("pork")) {
    return round2(
      frozen
        ? LUMPIA_DOZEN_COGS_USD.pork.frozen
        : LUMPIA_DOZEN_COGS_USD.pork.cooked
    );
  }
  if (h.includes("turkey")) {
    return round2(
      frozen
        ? LUMPIA_DOZEN_COGS_USD.turkey.frozen
        : LUMPIA_DOZEN_COGS_USD.turkey.cooked
    );
  }
  return null;
}

/** One napkin (~$0.03) allocated evenly across order lines for P&L in Sheets. */
export const NAPKIN_COST_PER_ORDER_USD = 0.03;

export function napkinCostSharePerLine(lineCount: number): number {
  return lineCount > 0 ? NAPKIN_COST_PER_ORDER_USD / lineCount : 0;
}

/**
 * Unit COGS for one line (customer `name` + optional `size` label), before per-order napkin share.
 */
export function getUnitCost(name: string, size?: string | null): number {
  const h = `${name} ${size ?? ""}`.toLowerCase();

  const lumpiaSampleCogs = lumpiaSample4pcCogsFromHaystack(h);
  if (lumpiaSampleCogs != null) return lumpiaSampleCogs;

  const lumpiaCogs = lumpiaDozenCogsFromHaystack(h);
  if (lumpiaCogs != null) return lumpiaCogs;

  if (h.includes("pancit") && h.includes("chicken") && h.includes("party"))
    return 41.47;
  if (
    h.includes("pancit") &&
    h.includes("chicken") &&
    (h.includes("2–4") || h.includes("2-4"))
  )
    return 15.95;
  if (h.includes("pancit") && h.includes("chicken")) return 8.49;
  if (h.includes("pancit") && h.includes("shrimp") && h.includes("party"))
    return 49.67;
  if (
    h.includes("pancit") &&
    h.includes("shrimp") &&
    (h.includes("2–4") || h.includes("2-4"))
  )
    return 17.38;
  if (h.includes("pancit") && h.includes("shrimp")) return 9.71;

  if (/flan|leche flan/i.test(name)) return 2.71;
  if (h.includes("quail")) return 3.82;

  const tocinoCogs = tocinoUnitCostFromHaystack(h);
  if (tocinoCogs != null) return tocinoCogs;

  const adoboCogs = adoboUnitCostFromHaystack(h);
  if (adoboCogs != null) return adoboCogs;

  return 0;
}

/** Uses name, size label, and cooked/frozen so lumpia lines match without “cooked” in the title. */
export function getSauceCupsFromOrderLine(
  line: Pick<OrderItemLine, "name" | "size" | "cookedOrFrozen">
): number {
  const h = `${line.name} ${line.size ?? ""} ${line.cookedOrFrozen ?? ""}`.toLowerCase();
  if (h.includes("lumpia") && h.includes("frozen")) return 1;
  if (h.includes("lumpia") && (h.includes("cooked") || h.includes("cook"))) return 3;
  if (h.includes("quail")) return 2;
  if (h.includes("tocino") && h.includes("egg")) return 1;
  if (h.includes("adobo") && h.includes("party")) return 3;
  if (h.includes("adobo")) return 1;
  return 0;
}

export function totalSauceCupsForItems(
  items: Pick<OrderItemLine, "name" | "size" | "cookedOrFrozen" | "quantity">[]
): number {
  return items.reduce((s, i) => s + getSauceCupsFromOrderLine(i) * i.quantity, 0);
}

/** Legacy helper — base unit cost without napkin share (napkin applied in Sheets payload). */
export function getOrderLineUnitCostUsd(line: OrderItemLine): number {
  return getUnitCost(line.name, line.size);
}

export function orderLineEstimatedProfitUsd(
  line: OrderItemLine,
  napkinShare: number = 0
): number {
  const uc = getUnitCost(line.name, line.size) + napkinShare;
  return Math.round(line.quantity * (line.unitPrice - uc) * 100) / 100;
}
