import type { OrderItemLine } from "./order-types";
import type { LumpiaSampleProtein } from "./lumpia-cost-model";

export type CartLine = {
  id: string;
  menuItemId: string;
  name: string;
  photoUrl: string;
  quantity: number;
  unitPrice: number;
  sizeKey: string;
  sizeLabel: string;
  cookedOrFrozen?: "cooked" | "frozen";
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
  cookedOrFrozen?: "cooked" | "frozen"
): string {
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

export function cartLinesToOrderItems(lines: CartLine[]): OrderItemLine[] {
  return lines.map((l) => ({
    name: l.name,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    size: l.sizeLabel,
    cookedOrFrozen: l.cookedOrFrozen,
    menuItemId: l.menuItemId,
    isSample: false,
  }));
}
