import type { Prisma } from "@prisma/client";
import type { InventoryItem } from "@prisma/client";
import type { OrderItemLine } from "@/lib/order-types";
import {
  INVENTORY_DEDUCTION_LUMPIA_PIECES,
  INVENTORY_DEDUCTION_ORDER_LINE_QTY,
  isLumpiaPiecesDeductionMode,
  normalizeInventoryDeductionMode,
} from "@/lib/inventory-deduction-modes";
import { applyInventoryStockRulesInTx } from "@/lib/inventory-stock-rules";
import {
  inventoryLineCookFilterMatchesLine,
  normalizeInventoryLineCookFilter,
} from "@/lib/inventory-line-cook-filter";
import {
  inventoryQuantityAsPieces,
  isLumpiaMenuItemId,
  lumpiaPiecesForOrderLine,
} from "@/lib/lumpia-inventory";

/**
 * Map order line to dozen-units for frozen lumpia inventory.
 * @deprecated Use `lumpiaPiecesForOrderLine` — kept for older imports.
 */
export function frozenLumpiaDozenUnits(line: OrderItemLine): number {
  const pieces = lumpiaPiecesForOrderLine(line);
  if (pieces <= 0) return 0;
  return Math.ceil(pieces / 12);
}

/** Exported for pickup-slot narrowing — must stay aligned with deduction. */
export function lineMatchesInventory(
  inv: InventoryItem,
  line: OrderItemLine
): boolean {
  const mode = normalizeInventoryDeductionMode(inv.deductionMode);

  if (isLumpiaPiecesDeductionMode(mode)) {
    const mid = inv.menuItemId?.trim();
    if (!mid || !isLumpiaMenuItemId(mid)) return false;
    if (line.isSample) {
      if (!/lumpia/i.test(line.name)) return false;
      const lineMid = line.menuItemId?.trim();
      return lineMid === mid;
    }
    return line.menuItemId?.trim() === mid;
  }

  const cookRule = (inv as { lineCookFilter?: string | null }).lineCookFilter;
  if (
    !inventoryLineCookFilterMatchesLine(
      normalizeInventoryLineCookFilter(cookRule),
      line.cookedOrFrozen
    )
  ) {
    return false;
  }

  if (mode === INVENTORY_DEDUCTION_ORDER_LINE_QTY) {
    if (line.isSample) return false;
    const mid = inv.menuItemId?.trim();
    const lid = line.menuItemId?.trim();
    if (!mid || !lid) return false;
    return mid === lid;
  }

  return false;
}

/**
 * Units of `quantityInStock` consumed by these order lines for one inventory row.
 * Lumpia rows deduct pieces (stored as pieces, or legacy dozen × 12).
 */
export function computeInventoryStockUnits(
  inv: InventoryItem,
  lines: OrderItemLine[]
): number {
  const mode = normalizeInventoryDeductionMode(inv.deductionMode);
  let total = 0;
  for (const line of lines) {
    if (!lineMatchesInventory(inv, line)) continue;
    if (isLumpiaPiecesDeductionMode(mode)) {
      total += lumpiaPiecesForOrderLine(line);
    } else if (mode === INVENTORY_DEDUCTION_ORDER_LINE_QTY) {
      total += Math.max(0, Math.floor(Number(line.quantity)) || 0);
    }
  }
  return total;
}

/** @deprecated Use `computeInventoryStockUnits` — name kept for older call sites. */
export const computeDozenUnitsForInventory = computeInventoryStockUnits;

/**
 * When unitLabel is dozen, convert piece deduction to dozen decrements (round up).
 */
function decrementAmountForInventory(
  inv: InventoryItem,
  pieceUnits: number
): number {
  if (pieceUnits <= 0) return 0;
  const u = inv.unitLabel.trim().toLowerCase();
  if (
    isLumpiaPiecesDeductionMode(normalizeInventoryDeductionMode(inv.deductionMode)) &&
    /^dozen$/i.test(u)
  ) {
    return Math.ceil(pieceUnits / 12);
  }
  return pieceUnits;
}

/**
 * Single entry point: subtract stock and write deduction logs after an order is persisted.
 * Idempotent per order via deduction logs.
 */
export async function deductInventoryForOrderInTx(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    items: string;
    manualEntry: boolean;
    isDemo: boolean;
  }
): Promise<void> {
  if (order.isDemo) return;

  const prior = await tx.inventoryDeductionLog.count({
    where: { orderId: order.id },
  });
  if (prior > 0) return;

  let lines: OrderItemLine[];
  try {
    lines = JSON.parse(order.items) as OrderItemLine[];
    if (!Array.isArray(lines)) return;
  } catch {
    return;
  }

  const inventories = await tx.inventoryItem.findMany();
  const touchedIds: number[] = [];

  for (const inv of inventories) {
    const pieceUnits = computeInventoryStockUnits(inv, lines);
    const units = decrementAmountForInventory(inv, pieceUnits);
    if (units <= 0) continue;

    await tx.inventoryItem.update({
      where: { id: inv.id },
      data: {
        quantityInStock: { decrement: units },
      },
    });

    await tx.inventoryDeductionLog.create({
      data: {
        inventoryItemId: inv.id,
        orderId: order.id,
        quantityDeducted: units,
        wasManualEntry: order.manualEntry,
        note: `Decrement ${units} ${inv.unitLabel} (${pieceUnits} lumpia pcs when applicable)`,
      },
    });
    touchedIds.push(inv.id);
  }

  for (const id of new Set(touchedIds)) {
    await applyInventoryStockRulesInTx(tx, id);
  }
}

/** Pre-check lumpia stock before order commit (pieces, shared cooked/frozen pool). */
export async function assertLumpiaInventoryAvailableInTx(
  tx: Prisma.TransactionClient,
  lines: OrderItemLine[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const inventories = await tx.inventoryItem.findMany({
    where: {
      OR: [
        { deductionMode: INVENTORY_DEDUCTION_LUMPIA_PIECES },
        { deductionMode: "lumpia_frozen_dozen" },
      ],
    },
  });

  for (const inv of inventories) {
    const need = computeInventoryStockUnits(inv, lines);
    if (need <= 0) continue;
    if (!inv.isAvailable) {
      return {
        ok: false,
        message: `${inv.itemName.trim()} is not available for ordering right now.`,
      };
    }
    const have = inventoryQuantityAsPieces(inv);
    if (need > have) {
      return {
        ok: false,
        message: `Not enough ${inv.itemName.trim()} in stock for this order. Please reduce quantity or pick another protein.`,
      };
    }
  }

  return { ok: true };
}
