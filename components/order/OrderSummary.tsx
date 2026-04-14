"use client";

import type { OrderItemLine } from "@/lib/order-types";
import { PRICING, salesTaxPercentLabel } from "@/lib/config";
import { SalesTaxDisclosure } from "@/components/checkout/SalesTaxDisclosure";

export function OrderSummary({
  items,
  wantsUtensils,
  utensilSets,
  utensilCharge,
  subtotal,
  tax,
  total,
}: {
  items: OrderItemLine[];
  wantsUtensils: boolean;
  utensilSets: number;
  utensilCharge: number;
  subtotal: number;
  tax: number;
  total: number;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold">
        Order summary
      </h2>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((i, idx) => (
          <li key={idx} className="flex justify-between gap-3 sm:gap-4">
            <span className="min-w-0 break-words">
              {i.name}
              {i.size ? ` · ${i.size}` : ""}
              {i.cookedOrFrozen === "frozen" || i.cookedOrFrozen === "cooked"
                ? ` · ${i.cookedOrFrozen}`
                : ""}
              {i.isSample ? " · sample" : ""} ×{i.quantity}
            </span>
            <span className="shrink-0 font-semibold">
              ${(i.unitPrice * i.quantity).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-[var(--border)] pt-4 text-sm">
        <div className="flex justify-between">
          <span>
            Utensils
            {wantsUtensils && utensilSets > 0
              ? ` (${utensilSets} sets @ $${PRICING.UTENSIL_PER_SET.toFixed(2)})`
              : ""}
          </span>
          <span>
            {wantsUtensils && utensilSets > 0
              ? `$${utensilCharge.toFixed(2)}`
              : "None"}
          </span>
        </div>
        <div className="mt-3 flex justify-between font-semibold">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Tax ({salesTaxPercentLabel()})</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 text-lg font-bold text-[var(--primary)]">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <SalesTaxDisclosure className="mt-3" />
      </div>
    </div>
  );
}
