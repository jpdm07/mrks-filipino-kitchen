import type { OrderItemLine } from "@/lib/order-types";
import {
  COOK_MINUTES_BY_MENU_ITEM,
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

export function cartHasOnlyFlanItems(lines: OrderItemLine[]): boolean {
  if (lines.length === 0) return false;
  return lines.every((line) => {
    if (line.isSample) {
      const n = line.name.toLowerCase();
      return n.includes("flan") || n.includes("leche");
    }
    const mid = line.menuItemId?.trim();
    if (!mid) return false;
    return COOK_MINUTES_BY_MENU_ITEM[mid]?.isFlan === true;
  });
}

export function cartHasAnyNonFlanItem(lines: OrderItemLine[]): boolean {
  return !cartHasOnlyFlanItems(lines);
}
