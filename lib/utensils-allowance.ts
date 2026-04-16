import { PRICING } from "@/lib/config";
import { isExtraDipOrderLine } from "@/lib/extra-dip-sauce";
import type { OrderItemLine } from "@/lib/order-types";

/**
 * Counts ready-made tocino plates, single-serving pancit orders, and pancit
 * sample containers — each maps to one complimentary utensil set (on top of
 * the per-order minimum in `PRICING.COMPLIMENTARY_UTENSIL_SETS_PER_ORDER`.
 */
export function plateBasedUtensilComplimentaryBasisFromOrderItems(
  items: OrderItemLine[]
): number {
  let n = 0;
  for (const i of items) {
    if (isExtraDipOrderLine(i)) continue;
    if (i.isSample && /Sample:\s*Pancit/i.test(i.name)) {
      n += i.quantity;
      continue;
    }
    const id = i.menuItemId ?? "";
    const sk = i.sizeKey ?? "";
    if ((id === "seed-8" || id === "seed-9") && sk === "plate") {
      n += i.quantity;
      continue;
    }
    if ((id === "seed-4" || id === "seed-5") && sk === "small") {
      n += i.quantity;
      continue;
    }
    const nameLower = i.name.toLowerCase();
    if (
      nameLower.includes("tocino") &&
      !nameLower.includes("frozen") &&
      (sk === "plate" || /\bplate\b/i.test(i.size ?? ""))
    ) {
      n += i.quantity;
      continue;
    }
    if (nameLower.startsWith("pancit:") && sk === "small") {
      n += i.quantity;
    }
  }
  return n;
}

export function complimentaryUtensilAllowanceFromOrderItems(
  items: OrderItemLine[]
): number {
  const basis = plateBasedUtensilComplimentaryBasisFromOrderItems(items);
  return Math.max(PRICING.COMPLIMENTARY_UTENSIL_SETS_PER_ORDER, basis);
}
