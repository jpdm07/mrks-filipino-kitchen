import { computeUtensilChargeUsd, PRICING } from "@/lib/config";
import { complimentaryUtensilAllowanceFromOrderItems } from "@/lib/utensils-allowance";
import type { OrderItemLine } from "@/lib/order-types";

/** Subtotal, tax, and total for an order (items + optional utensils). Used at checkout and admin refunds. */
export function computeOrderMonetaryTotals(
  items: OrderItemLine[],
  wantsUtensils: boolean,
  utensilSets: number
) {
  const itemsSub = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  let sets = 0;
  if (wantsUtensils) {
    const raw = Math.max(0, Math.min(50, Math.floor(Number(utensilSets) || 0)));
    sets = raw >= 1 ? raw : 1;
  }
  const complimentary = complimentaryUtensilAllowanceFromOrderItems(items);
  const ut = computeUtensilChargeUsd(wantsUtensils, sets, complimentary);
  const sub = Math.round((itemsSub + ut) * 100) / 100;
  const tax = Math.round(sub * PRICING.TAX_RATE * 100) / 100;
  const total = Math.round((sub + tax) * 100) / 100;
  return { itemsSub, ut, sets, sub, tax, total };
}
