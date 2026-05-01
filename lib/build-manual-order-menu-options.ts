import type { MenuItemDTO } from "@/lib/menu-types";
import type { OrderItemLine } from "@/lib/order-types";
import { adoboOrderSizeLine } from "@/lib/cart-types";

export type ManualOrderMenuOption = {
  value: string;
  label: string;
  /** Line fields except quantity (filled when user picks this option). */
  line: Omit<OrderItemLine, "quantity">;
};

function cookedFrozenFromSizeKey(sk: string): "cooked" | "frozen" | undefined {
  if (sk.startsWith("frozen-")) return "frozen";
  if (sk.startsWith("cooked-")) return "cooked";
  return undefined;
}

/**
 * Flat options for admin manual orders: each menu size becomes one dropdown row with correct price.
 */
export function buildManualOrderMenuOptions(
  items: MenuItemDTO[]
): ManualOrderMenuOption[] {
  const out: ManualOrderMenuOption[] = [];
  const eligible = items.filter((m) => m.isActive && !m.soldOut);

  for (const item of eligible) {
    if (item.id === "seed-12") {
      for (const protein of ["chicken", "pork"] as const) {
        for (const sz of item.sizes) {
          const price = Number(sz.price);
          if (!Number.isFinite(price)) continue;
          const sizeDisplay = adoboOrderSizeLine(protein, sz.key);
          out.push({
            value: `seed-12|${sz.key}|${protein}`,
            label: `${item.name} — ${protein === "chicken" ? "Chicken" : "Pork"} — ${sz.label} ($${price.toFixed(2)})`,
            line: {
              name: item.name,
              unitPrice: price,
              size: sizeDisplay,
              sizeKey: sz.key,
              menuItemId: item.id,
              adoboProtein: protein,
              category: item.category,
            },
          });
        }
      }
      continue;
    }

    for (const sz of item.sizes) {
      const price = Number(sz.price);
      if (!Number.isFinite(price)) continue;
      const cf = cookedFrozenFromSizeKey(sz.key);
      out.push({
        value: `${item.id}|${sz.key}`,
        label: `${item.name} — ${sz.label} ($${price.toFixed(2)})`,
        line: {
          name: item.name,
          unitPrice: price,
          size: sz.label,
          sizeKey: sz.key,
          menuItemId: item.id,
          ...(cf ? { cookedOrFrozen: cf } : {}),
          category: item.category,
        },
      });
    }
  }

  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return out;
}
