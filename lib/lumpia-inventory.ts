import type { InventoryItem } from "@prisma/client";
import type { OrderItemLine } from "@/lib/order-types";
import { LUMPIA_MENU_ITEM_IDS } from "@/lib/inventory-constants";
import type { CartLine } from "@/lib/cart-types";

/** Menu SKUs: seed-1 beef, seed-2 pork, seed-3 turkey. */
export const LUMPIA_PROTEIN_BY_MENU_ID: Record<
  (typeof LUMPIA_MENU_ITEM_IDS)[number],
  "beef" | "pork" | "turkey"
> = {
  "seed-1": "beef",
  "seed-2": "pork",
  "seed-3": "turkey",
};

export const LUMPIA_MENU_ID_BY_PROTEIN: Record<
  "beef" | "pork" | "turkey",
  (typeof LUMPIA_MENU_ITEM_IDS)[number]
> = {
  beef: "seed-1",
  pork: "seed-2",
  turkey: "seed-3",
};

export type LumpiaProtein = keyof typeof LUMPIA_MENU_ID_BY_PROTEIN;

const lumpiaMenuIds = new Set<string>(LUMPIA_MENU_ITEM_IDS);

export function isLumpiaMenuItemId(id: string | null | undefined): boolean {
  const t = id?.trim();
  return Boolean(t && lumpiaMenuIds.has(t));
}

export function lumpiaProteinFromMenuItemId(
  id: string | null | undefined
): LumpiaProtein | null {
  const t = id?.trim();
  if (!t || !(t in LUMPIA_PROTEIN_BY_MENU_ID)) return null;
  return LUMPIA_PROTEIN_BY_MENU_ID[t as keyof typeof LUMPIA_PROTEIN_BY_MENU_ID];
}

/** Pieces per single cart/order line (before line quantity multiplier). */
export function lumpiaPiecesPerUnitFromSizeKey(sizeKey: string | null | undefined): number {
  const sk = (sizeKey ?? "").toLowerCase();
  if (sk.includes("party")) return 50;
  if (sk.includes("2dz")) return 24;
  if (sk.includes("1dz")) return 12;
  if (sk === "cooked" || sk === "frozen") return 12;
  return 12;
}

/** Total pieces consumed by one order line (includes quantity). */
export function lumpiaPiecesForOrderLine(line: OrderItemLine): number {
  if (line.isSample) {
    if (!/lumpia/i.test(line.name)) return 0;
    const mid = line.menuItemId?.trim();
    if (mid && isLumpiaMenuItemId(mid)) {
      const q = Math.max(0, Math.floor(Number(line.quantity)) || 0);
      return q * 4;
    }
    const protein = lumpiaProteinFromSampleLineName(line.name);
    if (!protein) return 0;
    const q = Math.max(0, Math.floor(Number(line.quantity)) || 0);
    return q * 4;
  }

  const mid = line.menuItemId?.trim();
  if (!mid || !isLumpiaMenuItemId(mid)) return 0;
  const q = Math.max(0, Math.floor(Number(line.quantity)) || 0);
  if (q <= 0) return 0;
  return q * lumpiaPiecesPerUnitFromSizeKey(line.sizeKey);
}

export function lumpiaPiecesForCartLine(line: CartLine): number {
  if (!isLumpiaMenuItemId(line.menuItemId)) return 0;
  const q = Math.max(0, Math.floor(Number(line.quantity)) || 0);
  if (q <= 0) return 0;
  return q * lumpiaPiecesPerUnitFromSizeKey(line.sizeKey);
}

function lumpiaProteinFromSampleLineName(name: string): LumpiaProtein | null {
  const n = name.toLowerCase();
  if (!n.includes("lumpia")) return null;
  if (n.includes("beef")) return "beef";
  if (n.includes("turkey")) return "turkey";
  if (n.includes("pork")) return "pork";
  return null;
}

/** Read admin stock as whole pieces (legacy rows may still use unitLabel dozen). */
export function inventoryQuantityAsPieces(inv: Pick<InventoryItem, "quantityInStock" | "unitLabel">): number {
  const raw = Math.max(0, Math.floor(Number(inv.quantityInStock)) || 0);
  const u = inv.unitLabel.trim().toLowerCase();
  if (/^dozen$/i.test(u)) return raw * 12;
  return raw;
}

export function formatLumpiaPieceCount(pieces: number): string {
  const n = Math.max(0, Math.floor(pieces));
  return n === 1 ? "1 piece" : `${n} pieces`;
}

/** Banner line for one protein — no cooked/frozen split. */
export function lumpiaFlavorBannerMessage(
  proteinLabel: string,
  pieces: number
): string {
  return `Lumpia — ${proteinLabel}: ${formatLumpiaPieceCount(pieces)} available for same-day pickup. Order below (cooked or frozen — your choice at checkout).`;
}

export type LumpiaStockByProtein = Record<LumpiaProtein, number>;

export function emptyLumpiaStock(): LumpiaStockByProtein {
  return { beef: 0, pork: 0, turkey: 0 };
}

/** Sum inventory rows linked to each lumpia menu SKU (ignores lineCookFilter — shared pool). */
export function aggregateLumpiaStockFromRows(
  rows: InventoryItem[]
): LumpiaStockByProtein {
  const out = emptyLumpiaStock();
  for (const row of rows) {
    if (!row.isAvailable || row.quantityInStock <= 0) continue;
    const mid = row.menuItemId?.trim();
    const protein = mid ? lumpiaProteinFromMenuItemId(mid) : null;
    if (!protein) continue;
    out[protein] += inventoryQuantityAsPieces(row);
  }
  return out;
}

export function lumpiaStockForMenuItemId(
  stock: LumpiaStockByProtein,
  menuItemId: string
): number {
  const p = lumpiaProteinFromMenuItemId(menuItemId);
  return p ? stock[p] : 0;
}

export function lumpiaHasStockForOrderLine(
  stock: LumpiaStockByProtein,
  line: OrderItemLine
): boolean {
  const need = lumpiaPiecesForOrderLine(line);
  if (need <= 0) return true;
  let protein: LumpiaProtein | null = null;
  if (line.isSample && /lumpia/i.test(line.name)) {
    protein =
      lumpiaProteinFromMenuItemId(line.menuItemId) ??
      lumpiaProteinFromSampleLineName(line.name);
  } else {
    protein = lumpiaProteinFromMenuItemId(line.menuItemId);
  }
  if (!protein) return true;
  return stock[protein] >= need;
}

export function lumpiaHasStockForCartSelection(
  stock: LumpiaStockByProtein,
  menuItemId: string,
  sizeKey: string,
  qty: number
): boolean {
  const need =
    Math.max(0, Math.floor(qty) || 0) * lumpiaPiecesPerUnitFromSizeKey(sizeKey);
  if (need <= 0) return true;
  const p = lumpiaProteinFromMenuItemId(menuItemId);
  if (!p) return true;
  return stock[p] >= need;
}

export function lumpiaHasStockForSampleQty(
  stock: LumpiaStockByProtein,
  protein: LumpiaProtein,
  sampleQty: number
): boolean {
  const need = Math.max(0, Math.floor(sampleQty) || 0) * 4;
  if (need <= 0) return true;
  return stock[protein] >= need;
}

/** Minimum pieces to show a protein as orderable at all (smallest sellable unit). */
export const LUMPIA_MIN_ORDER_PIECES = 4;
