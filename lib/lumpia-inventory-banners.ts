import type { InventoryItem } from "@prisma/client";
import {
  isLumpiaPiecesDeductionMode,
  normalizeInventoryDeductionMode,
} from "@/lib/inventory-deduction-modes";
import { resolvedInventoryBannerMessage } from "@/lib/inventory-banner-copy";
import {
  aggregateLumpiaStockFromRows,
  emptyLumpiaStock,
  formatLumpiaPieceCount,
  inventoryQuantityAsPieces,
  lumpiaFlavorBannerMessage,
  lumpiaProteinFromMenuItemId,
  type LumpiaProtein,
  type LumpiaStockByProtein,
} from "@/lib/lumpia-inventory";

export type SiteBannerEntry = {
  key: string;
  message: string;
};

const PROTEIN_LABEL: Record<LumpiaProtein, string> = {
  beef: "Beef",
  pork: "Pork",
  turkey: "Turkey",
};

export function isLumpiaInventoryRow(row: InventoryItem): boolean {
  if (lumpiaProteinFromMenuItemId(row.menuItemId)) return true;
  return isLumpiaPiecesDeductionMode(
    normalizeInventoryDeductionMode(row.deductionMode)
  );
}

export function lumpiaManagedProteins(
  rows: InventoryItem[]
): Record<LumpiaProtein, boolean> {
  const out: Record<LumpiaProtein, boolean> = {
    beef: false,
    pork: false,
    turkey: false,
  };
  for (const row of rows) {
    if (
      !isLumpiaPiecesDeductionMode(
        normalizeInventoryDeductionMode(row.deductionMode)
      )
    ) {
      continue;
    }
    const p = lumpiaProteinFromMenuItemId(row.menuItemId);
    if (p) out[p] = true;
  }
  return out;
}

/** One banner line per lumpia flavor (shared cooked + frozen count). */
export function buildLumpiaBannerEntries(
  qualifyingRows: InventoryItem[]
): SiteBannerEntry[] {
  const lumpiaRows = qualifyingRows.filter(isLumpiaInventoryRow);
  if (!lumpiaRows.length) return [];

  const stock = aggregateLumpiaStockFromRows(lumpiaRows);
  const entries: SiteBannerEntry[] = [];
  for (const protein of ["beef", "pork", "turkey"] as const) {
    const pieces = stock[protein];
    if (pieces <= 0) continue;
    entries.push({
      key: `lumpia-${protein}`,
      message: lumpiaFlavorBannerMessage(PROTEIN_LABEL[protein], pieces),
    });
  }
  return entries;
}

/** Lumpia flavors first (aggregated), then other same-day inventory rows. */
export function buildSiteBannerEntries(
  qualifyingRows: InventoryItem[]
): SiteBannerEntry[] {
  const lumpiaRows = qualifyingRows.filter(isLumpiaInventoryRow);
  const otherRows = qualifyingRows.filter((r) => !isLumpiaInventoryRow(r));

  return [
    ...buildLumpiaBannerEntries(lumpiaRows),
    ...otherRows.map((inv) => ({
      key: `inv-${inv.id}`,
      message: resolvedInventoryBannerMessage({
        itemName: inv.itemName,
        quantityInStock: inv.quantityInStock,
        unitLabel: inv.unitLabel,
        bannerMessage: inv.bannerMessage,
      }),
    })),
  ];
}

export function buildPublicLumpiaStockPayload(rows: InventoryItem[]): {
  stock: LumpiaStockByProtein;
  managed: Record<LumpiaProtein, boolean>;
} {
  const managed = lumpiaManagedProteins(rows);
  const stock = emptyLumpiaStock();

  for (const row of rows) {
    const p = lumpiaProteinFromMenuItemId(row.menuItemId);
    if (!p) continue;
    if (
      !isLumpiaPiecesDeductionMode(
        normalizeInventoryDeductionMode(row.deductionMode)
      )
    ) {
      continue;
    }
    if (!row.isAvailable) continue;
    stock[p] += inventoryQuantityAsPieces(row);
  }

  return { stock, managed };
}

export { formatLumpiaPieceCount };
