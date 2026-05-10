import type { OrderItemLine } from "@/lib/order-types";

/** Minimal cart context for inventory pickup narrowing (matches deduction semantics). */
export type InventoryCartLineHint = {
  menuItemId: string;
  cookedOrFrozen?: "cooked" | "frozen" | null;
  sizeKey?: string | null;
  quantity?: number;
  isSample?: boolean;
};

export function inventoryCartHintsToMenuItemIds(
  hints: InventoryCartLineHint[]
): string[] {
  return [
    ...new Set(
      hints.map((h) => h.menuItemId.trim()).filter(Boolean)
    ),
  ].sort();
}

export function orderLinesToInventoryCartHints(
  lines: OrderItemLine[]
): InventoryCartLineHint[] {
  const out: InventoryCartLineHint[] = [];
  for (const line of lines) {
    const mid = line.menuItemId?.trim();
    if (!mid) continue;
    let cf: InventoryCartLineHint["cookedOrFrozen"];
    if (line.cookedOrFrozen === "frozen") cf = "frozen";
    else if (line.cookedOrFrozen === "cooked") cf = "cooked";
    else cf = undefined;
    out.push({
      menuItemId: mid,
      cookedOrFrozen: cf,
      sizeKey: line.sizeKey ?? null,
      quantity: line.quantity,
      isSample: line.isSample === true,
    });
  }
  return out;
}

export function hintToPseudoOrderLine(h: InventoryCartLineHint): OrderItemLine {
  const qty = Math.max(0, Math.floor(Number(h.quantity)) || 0);
  const cookedOrFrozen =
    h.cookedOrFrozen === "frozen"
      ? "frozen"
      : h.cookedOrFrozen === "cooked"
        ? "cooked"
        : undefined;
  return {
    name: "",
    quantity: qty,
    unitPrice: 0,
    menuItemId: h.menuItemId.trim(),
    sizeKey: h.sizeKey ?? undefined,
    ...(cookedOrFrozen ? { cookedOrFrozen } : {}),
    isSample: h.isSample === true,
  };
}

/** Parse `invCart` query param: JSON array of hints (URI-encoded). */
export function parseInventoryCartHintsFromSearchParams(
  searchParams: URLSearchParams
): InventoryCartLineHint[] | null {
  const raw = searchParams.get("invCart");
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return null;
    const out: InventoryCartLineHint[] = [];
    for (const el of j) {
      if (!el || typeof el !== "object") continue;
      const o = el as Record<string, unknown>;
      const menuItemId =
        typeof o.menuItemId === "string" ? o.menuItemId.trim() : "";
      if (!menuItemId) continue;
      let cookedOrFrozen: InventoryCartLineHint["cookedOrFrozen"];
      const cf = o.cookedOrFrozen;
      if (cf === "frozen" || cf === "cooked") cookedOrFrozen = cf;
      else cookedOrFrozen = undefined;
      const sizeKey =
        typeof o.sizeKey === "string" ? o.sizeKey : null;
      const quantity =
        typeof o.quantity === "number" && Number.isFinite(o.quantity)
          ? o.quantity
          : undefined;
      const isSample = o.isSample === true;
      out.push({
        menuItemId,
        cookedOrFrozen,
        sizeKey,
        quantity,
        isSample,
      });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}
