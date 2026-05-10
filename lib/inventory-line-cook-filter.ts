/** Stored on `InventoryItem.lineCookFilter` — keeps cooked vs frozen stock separate for one menu SKU. */
export type InventoryLineCookFilter = "any" | "cooked" | "frozen";

export function normalizeInventoryLineCookFilter(
  raw: string | null | undefined
): InventoryLineCookFilter {
  const s = (raw ?? "any").trim().toLowerCase();
  if (s === "frozen") return "frozen";
  if (s === "cooked") return "cooked";
  return "any";
}

export function isValidInventoryLineCookFilter(s: string): s is InventoryLineCookFilter {
  return s === "any" || s === "cooked" || s === "frozen";
}

/**
 * Whether an order/cart line matches this inventory row’s cooked/frozen rule.
 * Lines without `cookedOrFrozen` (flan, etc.) match `any` and `cooked`, not `frozen`.
 */
export function inventoryLineCookFilterMatchesLine(
  filter: InventoryLineCookFilter,
  lineCookedOrFrozen: string | null | undefined
): boolean {
  if (filter === "any") return true;
  const cf =
    lineCookedOrFrozen === "frozen"
      ? "frozen"
      : lineCookedOrFrozen === "cooked"
        ? "cooked"
        : null;
  if (filter === "frozen") return cf === "frozen";
  // cooked: explicitly cooked, or no variant (not a frozen-only line)
  if (filter === "cooked") return cf !== "frozen";
  return true;
}
