import { computeOrderMonetaryTotals } from "@/lib/order-totals";
import type { OrderItemLine } from "@/lib/order-types";

export type LineDecrement = { index: number; qty: number };

export type ApplyRefundComputation =
  | {
      ok: true;
      newItems: OrderItemLine[];
      wantsUtensils: boolean;
      utensilSets: number;
      /** Utensil fee portion of subtotal (matches Order.utensilCharge). */
      utensilCharge: number;
      subtotal: number;
      tax: number;
      total: number;
      refundTotalUsd: number;
      lineChanges: { index: number; name: string; qtyRemoved: number; lineRefundUsd: number }[];
      utensilRefundUsd: number;
    }
  | { ok: false; error: string };

/**
 * Pure preview / apply math for a partial refund (reduce line qty and/or utensil sets).
 * Does not persist. Caller supplies current monetary totals for refund delta.
 */
export function computeOrderRefund(
  items: OrderItemLine[],
  wantsUtensils: boolean,
  utensilSets: number,
  currentTotal: number,
  lineDecrements: LineDecrement[],
  decreaseUtensilSetsBy: number
): ApplyRefundComputation {
  const decrements = mergeLineDecrements(lineDecrements);
  if (decrements.length === 0 && (decreaseUtensilSetsBy ?? 0) <= 0) {
    return { ok: false, error: "Choose at least one line quantity to refund or reduce utensil sets." };
  }

  for (const d of decrements) {
    if (!Number.isInteger(d.index) || d.index < 0 || d.index >= items.length) {
      return { ok: false, error: `Invalid line index ${d.index}.` };
    }
    if (!Number.isInteger(d.qty) || d.qty < 1) {
      return { ok: false, error: "Each line refund quantity must be a positive whole number." };
    }
    const line = items[d.index];
    if (!line || d.qty > line.quantity) {
      return {
        ok: false,
        error: `Cannot refund ${d.qty} of "${line?.name ?? "?"}" (only ${line?.quantity ?? 0} on the order).`,
      };
    }
  }

  const decBy = Math.max(0, Math.floor(Number(decreaseUtensilSetsBy) || 0));
  if (!wantsUtensils && decBy > 0) {
    return { ok: false, error: "This order has no utensil sets to reduce." };
  }
  if (wantsUtensils && decBy > utensilSets) {
    return {
      ok: false,
      error: `Cannot reduce utensils by ${decBy} (order has ${utensilSets} set(s)).`,
    };
  }

  const newItems = items.map((line, idx) => {
    const dec = decrements.find((x) => x.index === idx);
    if (!dec) return { ...line };
    const q = line.quantity - dec.qty;
    return { ...line, quantity: q };
  });
  const filtered = newItems.filter((l) => l.quantity > 0);

  let nextWants = wantsUtensils;
  let nextSets = Math.max(0, utensilSets - decBy);
  if (nextSets <= 0) {
    nextSets = 0;
    nextWants = false;
  }

  const before = computeOrderMonetaryTotals(items, wantsUtensils, utensilSets);
  const after = computeOrderMonetaryTotals(
    filtered,
    nextWants,
    nextWants ? Math.max(1, nextSets) : 0
  );

  const lineChanges = decrements.map((d) => {
    const line = items[d.index];
    const lineRefundUsd = Math.round(line.unitPrice * d.qty * 100) / 100;
    return {
      index: d.index,
      name: line.name,
      qtyRemoved: d.qty,
      lineRefundUsd,
    };
  });

  const utensilRefundUsd =
    Math.round((before.ut - after.ut) * 100) / 100;

  const refundTotalUsd = Math.round((currentTotal - after.total) * 100) / 100;
  if (refundTotalUsd <= 0) {
    return { ok: false, error: "That combination does not reduce the order total." };
  }

  return {
    ok: true,
    newItems: filtered,
    wantsUtensils: nextWants,
    utensilSets: nextWants ? after.sets : 0,
    utensilCharge: after.ut,
    subtotal: after.sub,
    tax: after.tax,
    total: after.total,
    refundTotalUsd,
    lineChanges,
    utensilRefundUsd,
  };
}

function mergeLineDecrements(raw: LineDecrement[]): { index: number; qty: number }[] {
  const map = new Map<number, number>();
  for (const d of raw) {
    if (!Number.isFinite(d.index)) continue;
    const q = Math.floor(Number(d.qty) || 0);
    if (q < 1) continue;
    map.set(d.index, (map.get(d.index) ?? 0) + q);
  }
  return [...map.entries()].map(([index, qty]) => ({ index, qty }));
}
