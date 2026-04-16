import type { CartLine, SampleSelection } from "@/lib/cart-types";
import type { OrderItemLine } from "@/lib/order-types";

export const EXTRA_DIP_UNIT_PRICE_USD = 0.5;
export const EXTRA_DIP_MAX_QTY = 24;
export const EXTRA_DIP_MENU_ITEM_ID = "addon-extra-dip";
export const EXTRA_DIP_SIZE_KEY = "extra-dip";

export function isExtraDipOrderLine(i: Pick<OrderItemLine, "menuItemId" | "sizeKey">): boolean {
  return (
    i.menuItemId === EXTRA_DIP_MENU_ITEM_ID || i.sizeKey === EXTRA_DIP_SIZE_KEY
  );
}

export function makeExtraDipOrderLine(qty: number): OrderItemLine {
  return {
    name: "Extra dipping sauce (2 oz cup)",
    quantity: qty,
    unitPrice: EXTRA_DIP_UNIT_PRICE_USD,
    size: "Add-on",
    sizeKey: EXTRA_DIP_SIZE_KEY,
    menuItemId: EXTRA_DIP_MENU_ITEM_ID,
    category: "addon",
  };
}

export function cartLineQualifiesForDipAddon(line: CartLine): boolean {
  const id = line.menuItemId;
  if (id === "seed-1" || id === "seed-2" || id === "seed-3") return true;
  if (id === "seed-7") return true;
  if (id === "seed-8" || id === "seed-9") return line.sizeKey === "plate";
  if (id === "seed-12") return true;
  return false;
}

/** One-line cart hint for included dipping sauces (not extra purchased cups). */
export function includedDippingSauceCartLine(line: CartLine): string | null {
  if (!cartLineQualifiesForDipAddon(line)) return null;
  const id = line.menuItemId;
  const q = Math.max(1, Math.floor(line.quantity));
  if (id === "seed-1" || id === "seed-2" || id === "seed-3") {
    return `${2 * q} dipping sauces included (2 per dozen)`;
  }
  if (id === "seed-7") {
    return `${2 * q} dipping sauces included`;
  }
  if ((id === "seed-8" || id === "seed-9") && line.sizeKey === "plate") {
    return `${q} dipping sauce${q === 1 ? "" : "s"} included`;
  }
  if (id === "seed-12") {
    if (line.sizeKey === "party") {
      return "Dipping sauces included for the party tray";
    }
    return `${q} dipping sauce${q === 1 ? "" : "s"} included`;
  }
  return null;
}

export function cartQualifiesForExtraDip(
  lines: CartLine[],
  samples: SampleSelection
): boolean {
  if (lines.some(cartLineQualifiesForDipAddon)) return true;
  if (samples.lumpiaQty > 0 && samples.lumpiaProtein) return true;
  if (samples.quailQty > 0) return true;
  return false;
}

/** Non–extra-dip lines that imply included dipping sauce (for server validation). */
export function orderItemLineQualifiesForDipContext(
  i: OrderItemLine
): boolean {
  if (isExtraDipOrderLine(i)) return false;
  if (i.isSample) {
    const n = i.name.toLowerCase();
    if (n.includes("sample") && n.includes("lumpia")) return true;
    if (n.includes("sample") && n.includes("quail")) return true;
    return false;
  }
  const id = i.menuItemId?.trim();
  if (!id) return false;
  if (id === "seed-1" || id === "seed-2" || id === "seed-3") return true;
  if (id === "seed-7") return true;
  if (id === "seed-8" || id === "seed-9") {
    return i.sizeKey === "plate" || /ready-made plate/i.test(i.name);
  }
  if (id === "seed-12") return true;
  return false;
}

export function orderHasDipEligibleFoodItems(items: OrderItemLine[]): boolean {
  return items.some((i) => orderItemLineQualifiesForDipContext(i));
}

/**
 * Merge duplicate extra-dip lines, validate price/qty/eligibility. Returns food-only
 * lines on error (caller should 400) or canonical single dip line when valid.
 */
export function sanitizeExtraDipOrderLines(
  items: OrderItemLine[]
): { items: OrderItemLine[]; error?: string } {
  const dipLines = items.filter(isExtraDipOrderLine);
  const food = items.filter((i) => !isExtraDipOrderLine(i));
  if (dipLines.length === 0) return { items };

  let totalQty = 0;
  for (const d of dipLines) {
    if (d.unitPrice !== EXTRA_DIP_UNIT_PRICE_USD) {
      return {
        items: food,
        error: `Extra dipping sauce must be $${EXTRA_DIP_UNIT_PRICE_USD.toFixed(2)} each.`,
      };
    }
    const q = Math.floor(Number(d.quantity));
    if (!Number.isFinite(q) || q < 0) {
      return { items: food, error: "Invalid extra dipping sauce quantity." };
    }
    totalQty += q;
  }

  totalQty = Math.min(EXTRA_DIP_MAX_QTY, totalQty);
  if (totalQty <= 0) return { items: food };

  if (!orderHasDipEligibleFoodItems(food)) {
    return {
      items: food,
      error:
        "Extra dipping sauce can only be ordered with lumpia, quail eggs, tocino plates, adobo, or lumpia/quail samples.",
    };
  }

  return { items: [...food, makeExtraDipOrderLine(totalQty)] };
}
