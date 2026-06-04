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

export type LumpiaSamplesByProtein = Record<LumpiaSampleProtein, number>;

export type SampleSelection = {
  lumpiaByProtein: LumpiaSamplesByProtein;
  quailQty: number;
  flanQty: number;
  pancitQty: number;
  pancitType: "chicken" | "shrimp" | null;
};

export const emptyLumpiaSamplesByProtein = (): LumpiaSamplesByProtein => ({
  beef: 0,
  pork: 0,
  turkey: 0,
});

export const emptySamples = (): SampleSelection => ({
  lumpiaByProtein: emptyLumpiaSamplesByProtein(),
  quailQty: 0,
  flanQty: 0,
  pancitQty: 0,
  pancitType: null,
});

export function lumpiaSampleQtyTotal(s: SampleSelection): number {
  return s.lumpiaByProtein.beef + s.lumpiaByProtein.pork + s.lumpiaByProtein.turkey;
}

export function hasAnyLumpiaSamples(s: SampleSelection): boolean {
  return lumpiaSampleQtyTotal(s) > 0;
}

/** Pancit samples in the cart must have type when qty &gt; 0. */
export function samplesSelectionComplete(s: SampleSelection): boolean {
  if (s.pancitQty > 0 && !s.pancitType) return false;
  return true;
}

/** Migrate legacy cart storage (single protein + qty) to per-flavor map. */
export function normalizeSampleSelection(raw: unknown): SampleSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (o.lumpiaByProtein && typeof o.lumpiaByProtein === "object") {
    const lb = o.lumpiaByProtein as Record<string, unknown>;
    const beef = Math.max(0, Math.floor(Number(lb.beef)) || 0);
    const pork = Math.max(0, Math.floor(Number(lb.pork)) || 0);
    const turkey = Math.max(0, Math.floor(Number(lb.turkey)) || 0);
    const pt = o.pancitType;
    return {
      lumpiaByProtein: { beef, pork, turkey },
      quailQty: Math.max(0, Math.floor(Number(o.quailQty)) || 0),
      flanQty: Math.max(0, Math.floor(Number(o.flanQty)) || 0),
      pancitQty: Math.max(0, Math.floor(Number(o.pancitQty)) || 0),
      pancitType:
        pt === "chicken" || pt === "shrimp" ? pt : null,
    };
  }

  const legacyQty = Math.max(0, Math.floor(Number(o.lumpiaQty)) || 0);
  const legacyProtein = o.lumpiaProtein;
  const byProtein = emptyLumpiaSamplesByProtein();
  if (
    legacyQty > 0 &&
    (legacyProtein === "beef" ||
      legacyProtein === "pork" ||
      legacyProtein === "turkey")
  ) {
    byProtein[legacyProtein] = legacyQty;
  }
  const pt = o.pancitType;
  return {
    lumpiaByProtein: byProtein,
    quailQty: Math.max(0, Math.floor(Number(o.quailQty)) || 0),
    flanQty: Math.max(0, Math.floor(Number(o.flanQty)) || 0),
    pancitQty: Math.max(0, Math.floor(Number(o.pancitQty)) || 0),
    pancitType: pt === "chicken" || pt === "shrimp" ? pt : null,
  };
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
  for (const p of ["beef", "pork", "turkey"] as const) {
    const qty = selection.lumpiaByProtein[p];
    if (qty <= 0) continue;
    const protein = p.charAt(0).toUpperCase() + p.slice(1);
    const menuItemId =
      p === "beef" ? "seed-1" : p === "pork" ? "seed-2" : "seed-3";
    out.push({
      name: `Sample: Lumpia ${protein} (4 pcs)`,
      quantity: qty,
      unitPrice: prices.lumpia[p],
      isSample: true,
      category: "sample",
      menuItemId,
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

export function adoboOrderSizeLine(
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
