import type { OrderItemLine } from "@/lib/order-types";
import {
  COOK_MINUTES_BY_MENU_ITEM,
  DESSERT_PICKUP_ONLY_MENU_ITEM_IDS,
  FLAN_WEEKLY_CAP_RAMEKINS,
  MAIN_COOK_CAP_MINUTES,
} from "@/lib/menu-capacity-catalog";

export { MAIN_COOK_CAP_MINUTES, FLAN_WEEKLY_CAP_RAMEKINS };

export type CookContribution = { mainMinutes: number; flanRamekins: number };

function sampleContribution(line: OrderItemLine): CookContribution {
  const n = line.name.toLowerCase();
  let main = 0;
  if (n.includes("sample") && n.includes("lumpia")) main = 5;
  else if (n.includes("sample") && n.includes("quail")) main = 6;
  else if (n.includes("sample") && (n.includes("flan") || n.includes("leche"))) {
    return { mainMinutes: 0, flanRamekins: line.quantity };
  } else if (n.includes("sample") && n.includes("pancit")) main = 10;
  else main = 5;
  return { mainMinutes: main * line.quantity, flanRamekins: 0 };
}

/**
 * Cook minutes for cart/order lines. Flan counts toward ramekin cap only (mainMinutes 0 for flan SKU).
 */
export function cookContributionForLine(line: OrderItemLine): CookContribution {
  if (line.isSample) return sampleContribution(line);

  const mid = line.menuItemId?.trim();
  const sizeKey = line.sizeKey?.trim();
  if (!mid || !sizeKey) {
    return { mainMinutes: 0, flanRamekins: 0 };
  }

  const meta = COOK_MINUTES_BY_MENU_ITEM[mid];
  if (!meta) return { mainMinutes: 0, flanRamekins: 0 };

  const perUnit = meta.bySize[sizeKey];
  if (perUnit === undefined) return { mainMinutes: 0, flanRamekins: 0 };

  if (meta.isFlan) {
    return {
      mainMinutes: 0,
      flanRamekins: line.quantity,
    };
  }

  return { mainMinutes: perUnit * line.quantity, flanRamekins: 0 };
}

export function totalCookContribution(lines: OrderItemLine[]): CookContribution {
  return lines.reduce(
    (acc, line) => {
      const c = cookContributionForLine(line);
      return {
        mainMinutes: acc.mainMinutes + c.mainMinutes,
        flanRamekins: acc.flanRamekins + c.flanRamekins,
      };
    },
    { mainMinutes: 0, flanRamekins: 0 }
  );
}

/**
 * True when the cart is **dessert-pickup only** (Caramel flan and/or Yema) — no savory /
 * other menu SKUs. Same schedule as the historical “flan only” path (`cartMode=flan`):
 * Tue–Thu dessert days and standard rules for full-menu days.
 */
export function cartHasOnlyDessertPickupItems(
  lines: OrderItemLine[]
): boolean {
  if (lines.length === 0) return false;
  return lines.every((line) => {
    if (line.isSample) {
      const mid = line.menuItemId?.trim();
      if (mid && DESSERT_PICKUP_ONLY_MENU_ITEM_IDS.has(mid)) return true;
      const n = line.name.toLowerCase();
      return (
        n.includes("flan") || n.includes("leche") || n.includes("yema")
      );
    }
    const mid = line.menuItemId?.trim();
    if (!mid) return false;
    return (
      DESSERT_PICKUP_ONLY_MENU_ITEM_IDS.has(mid) ||
      COOK_MINUTES_BY_MENU_ITEM[mid]?.isFlan === true
    );
  });
}

/**
 * @deprecated Use {@link cartHasOnlyDessertPickupItems}. Name kept for callers;
 * “flan only” now means dessert-only (flan + yema).
 */
export const cartHasOnlyFlanItems = cartHasOnlyDessertPickupItems;

export function cartHasAnyNonDessertPickupItem(lines: OrderItemLine[]): boolean {
  return !cartHasOnlyDessertPickupItems(lines);
}

/** @deprecated use {@link cartHasAnyNonDessertPickupItem} */
export function cartHasAnyNonFlanItem(lines: OrderItemLine[]): boolean {
  return cartHasAnyNonDessertPickupItem(lines);
}
