import type { OrderItemLine } from "./order-types";
import type { LumpiaSampleProtein } from "./lumpia-cost-model";

export type CartLine = {
  id: string;
  menuItemId: string;
  name: string;
  /** Menu category (for prep summaries and analytics on saved orders). */
  category?: string;
  photoUrl: string;
  quantity: number;
  unitPrice: number;
  sizeKey: string;
  sizeLabel: string;
  cookedOrFrozen?: "cooked" | "frozen";
  /** `seed-12` Adobo — same list price for both. */
  adoboProtein?: "chicken" | "pork";
};

export type SampleSelection = {
  lumpiaQty: number;
  lumpiaProtein: "beef" | "pork" | "turkey" | null;
  quailQty: number;
  flanQty: number;
  pancitQty: number;
  pancitType: "chicken" | "shrimp" | null;
};

export const emptySamples = (): SampleSelection => ({
  lumpiaQty: 0,
  lumpiaProtein: null,
  quailQty: 0,
  flanQty: 0,
  pancitQty: 0,
  pancitType: null,
});

/** Lumpia / pancit samples in the cart must have protein/type when qty &gt; 0. */
export function samplesSelectionComplete(s: SampleSelection): boolean {
  if (s.lumpiaQty > 0 && !s.lumpiaProtein) return false;
  if (s.pancitQty > 0 && !s.pancitType) return false;
  return true;
}

export function cartLineKey(
  menuItemId: string,
  sizeKey: string,
  cookedOrFrozen?: "cooked" | "frozen",
  adoboProtein?: "chicken" | "pork"
): string {
  if (adoboProtein) {
    return `${menuItemId}|${sizeKey}|${cookedOrFrozen ?? ""}|${adoboProtein}`;
  }
  return `${menuItemId}|${sizeKey}|${cookedOrFrozen ?? ""}`;
}

export function samplesToLines(
  selection: SampleSelection,
  prices: {
    lumpia: Record<LumpiaSampleProtein, number>;
    quail: number;
    flan: number;
    pancit: number;
  }
): OrderItemLine[] {
  const out: OrderItemLine[] = [];
  if (selection.lumpiaQty > 0 && selection.lumpiaProtein) {
    const p = selection.lumpiaProtein;
    const protein = p.charAt(0).toUpperCase() + p.slice(1);
    out.push({
      name: `Sample: Lumpia ${protein} (4 pcs)`,
      quantity: selection.lumpiaQty,
      unitPrice: prices.lumpia[p],
      isSample: true,
      category: "sample",
    });
  }
  if (selection.quailQty > 0) {
    out.push({
      name: "Sample: Breaded Quail Eggs (3 pcs)",
      quantity: selection.quailQty,
      unitPrice: prices.quail,
      isSample: true,
      category: "sample",
    });
  }
  if (selection.flanQty > 0) {
    out.push({
      name: "Sample: Caramel Flan (Leche Flan)",
      quantity: selection.flanQty,
      unitPrice: prices.flan,
      size: "Individual (1 ramekin)",
      sizeKey: "individual",
      menuItemId: "seed-6",
      isSample: true,
      category: "sample",
    });
  }
  if (selection.pancitQty > 0 && selection.pancitType) {
    const t =
      selection.pancitType === "chicken" ? "Chicken" : "Shrimp";
    out.push({
      name: `Sample: Pancit ${t} (1 container)`,
      quantity: selection.pancitQty,
      unitPrice: prices.pancit,
      isSample: true,
      category: "sample",
    });
  }
  return out;
}

function adoboOrderSizeLine(
  protein: "chicken" | "pork",
  sizeKey: string
): string {
  const p = protein === "chicken" ? "Chicken" : "Pork";
  if (sizeKey === "party") {
    return `${p}, Party Tray (8–10)`;
  }
  return `${p}, Plate`;
}

export function cartLinesToOrderItems(lines: CartLine[]): OrderItemLine[] {
  return lines.map((l) => {
    const isAdobo = l.menuItemId === "seed-12" && l.adoboProtein;
    return {
      name: l.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      size: isAdobo
        ? adoboOrderSizeLine(l.adoboProtein!, l.sizeKey)
        : l.sizeLabel,
      sizeKey: l.sizeKey,
      cookedOrFrozen: l.cookedOrFrozen,
      menuItemId: l.menuItemId,
      isSample: false,
      ...(isAdobo ? { adoboProtein: l.adoboProtein } : {}),
      ...(l.category?.trim() ? { category: l.category.trim() } : {}),
    };
  });
}
