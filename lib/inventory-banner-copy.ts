import type { InventoryItem } from "@prisma/client";

export type InventoryBannerFields = Pick<
  InventoryItem,
  "itemName" | "quantityInStock" | "unitLabel" | "bannerMessage"
>;

/** Auto banner when `bannerMessage` is blank — matches admin preview rules. */
export function autoInventoryBannerMessage(inv: InventoryBannerFields): string {
  const pluralUnits =
    inv.quantityInStock === 1 ? inv.unitLabel.trim() : `${inv.unitLabel.trim()}s`;
  return `🧧 ${inv.itemName.trim()} available now! ${inv.quantityInStock} ${pluralUnits} in stock — order for same-day pickup.`;
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
