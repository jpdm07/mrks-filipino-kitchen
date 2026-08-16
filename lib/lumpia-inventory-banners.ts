import type { InventoryItem } from "@prisma/client";
import {
  isLumpiaPiecesDeductionMode,
  normalizeInventoryDeductionMode,
} from "@/lib/inventory-deduction-modes";
import {
  formatStockUnitPhrase,
  resolvedInventoryBannerMessage,
} from "@/lib/inventory-banner-copy";
import { normalizeInventoryLineCookFilter } from "@/lib/inventory-line-cook-filter";
import {
  aggregateLumpiaStockFromRows,
  emptyLumpiaStock,
  formatLumpiaCustomerAvailability,
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
  title?: string;
  availability?: string;
  styleNote?: string;
};

function cookStyleNote(
  cookFilter: "any" | "cooked" | "frozen"
): string {
  if (cookFilter === "frozen") return "Frozen";
  if (cookFilter === "cooked") return "Cooked";
  return "Cooked or frozen";
}

function inventoryRowEntry(row: InventoryItem): SiteBannerEntry {
  return {
    key: `inv-${row.id}`,
    message: resolvedInventoryBannerMessage({
      itemName: row.itemName,
      quantityInStock: row.quantityInStock,
      unitLabel: row.unitLabel,
      bannerMessage: row.bannerMessage,
    }),
    title: row.itemName.trim(),
    availability: formatStockUnitPhrase(
      row.quantityInStock,
      row.unitLabel.trim() || "units"
    ),
  };
}

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

/** One banner line per lumpia flavor. */
export function buildLumpiaBannerEntries(
  qualifyingRows: InventoryItem[]
): SiteBannerEntry[] {
  const lumpiaRows = qualifyingRows.filter(isLumpiaInventoryRow);
  if (!lumpiaRows.length) return [];

  const stock = aggregateLumpiaStockFromRows(lumpiaRows);
  const entries: SiteBannerEntry[] = [];
  const covered = new Set<number>();
  for (const protein of ["beef", "pork", "turkey"] as const) {
    const pieces = stock[protein];
    if (pieces <= 0) continue;
    const proteinRows = lumpiaRows.filter(
      (r) => lumpiaProteinFromMenuItemId(r.menuItemId) === protein
    );
    for (const row of proteinRows) covered.add(row.id);
    const filters = new Set(
      proteinRows.map((r) =>
        normalizeInventoryLineCookFilter(r.lineCookFilter)
      )
    );
    const cookFilter =
      filters.size === 1 ? [...filters][0]! : "any";
    const avail =
      formatLumpiaCustomerAvailability(pieces) ||
      formatLumpiaPieceCount(pieces);
    entries.push({
      key: `lumpia-${protein}`,
      message: lumpiaFlavorBannerMessage(
        PROTEIN_LABEL[protein],
        pieces,
        cookFilter
      ),
      title: `Lumpia — ${PROTEIN_LABEL[protein]}`,
      availability: avail,
      styleNote: cookStyleNote(cookFilter),
    });
  }
  for (const row of lumpiaRows) {
    if (covered.has(row.id)) continue;
    entries.push(inventoryRowEntry(row));
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
    ...otherRows.map((inv) => inventoryRowEntry(inv)),
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
