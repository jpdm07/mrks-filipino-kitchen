import type { InventoryItem } from "@prisma/client";

export type InventoryBannerFields = Pick<
  InventoryItem,
  "itemName" | "quantityInStock" | "unitLabel" | "bannerMessage"
>;

/** Readable count + unit for banners (handles dozen, labels ending in “s”, etc.). */
export function formatStockUnitPhrase(count: number, unitLabel: string): string {
  const u = unitLabel.trim() || "units";
  const n = Math.max(0, Math.floor(Number(count)) || 0);
  if (/^dozen$/i.test(u)) {
    return n === 1 ? "1 dozen" : `${n} dozen`;
  }
  if (n === 1) return `1 ${u}`;
  if (/s$/i.test(u)) return `${n} ${u}`;
  return `${n} ${u}s`;
}

/** Auto banner when `bannerMessage` is blank — matches admin preview rules. */
export function autoInventoryBannerMessage(inv: InventoryBannerFields): string {
  const qtyPhrase = formatStockUnitPhrase(
    inv.quantityInStock,
    inv.unitLabel.trim() || "units"
  );
  return `${inv.itemName.trim()} — ${qtyPhrase} in stock. Same-day pickup available — order below.`;
}

export function resolvedInventoryBannerMessage(inv: InventoryBannerFields): string {
  const custom = inv.bannerMessage?.trim();
  if (custom) return custom;
  return autoInventoryBannerMessage(inv);
}

/** Admin preview warning when banner cannot display publicly. */
export function inventoryBannerAdminWarning(inv: {
  quantityInStock: number;
  isAvailable: boolean;
}): string | null {
  if (inv.quantityInStock <= 0 || !inv.isAvailable) {
    return "Stock is 0 or item marked unavailable — banner will not display.";
  }
  return null;
}
