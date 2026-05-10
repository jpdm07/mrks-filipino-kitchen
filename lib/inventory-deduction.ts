import type { Prisma } from "@prisma/client";
import type { InventoryItem } from "@prisma/client";
import type { OrderItemLine } from "@/lib/order-types";
import { LUMPIA_MENU_ITEM_IDS } from "@/lib/inventory-constants";
import {
  INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN,
  INVENTORY_DEDUCTION_ORDER_LINE_QTY,
  normalizeInventoryDeductionMode,
} from "@/lib/inventory-deduction-modes";
import { applyInventoryStockRulesInTx } from "@/lib/inventory-stock-rules";
import {
  inventoryLineCookFilterMatchesLine,
  normalizeInventoryLineCookFilter,
} from "@/lib/inventory-line-cook-filter";

const lumpiaFrozenIds = new Set<string>(LUMPIA_MENU_ITEM_IDS);

/**
 * Map order line to dozen-units for frozen lumpia inventory.
 */
export function frozenLumpiaDozenUnits(line: OrderItemLine): number {
  if (line.isSample) return 0;
  if (line.cookedOrFrozen !== "frozen") return 0;
  const mid = line.menuItemId?.trim();
  if (!mid || !lumpiaFrozenIds.has(mid)) return 0;
  const sk = (line.sizeKey ?? "").toLowerCase();
  const q = Math.max(0, Math.floor(Number(line.quantity)) || 0);
  if (q <= 0) return 0;
  if (sk.includes("2dz")) return q * 2;
  if (sk.includes("1dz")) return q * 1;
  if (sk.includes("party")) return Math.ceil(q * (50 / 12));
  return q;
}

function lumpiaDozenUnitsForMatchedLine(
  inv: InventoryItem,
  line: OrderItemLine
): number {
  if (inv.menuItemId?.trim()) {
    const sk = (line.sizeKey ?? "").toLowerCase();
    const q = Math.max(0, Math.floor(Number(line.quantity)) || 0);
    if (q <= 0) return 0;
    if (sk.includes("2dz")) return q * 2;
    if (sk.includes("1dz")) return q * 1;
    if (sk.includes("party")) return Math.ceil(q * (50 / 12));
    return q;
  }
  return frozenLumpiaDozenUnits(line);
}

/** Exported for pickup-slot narrowing — must stay aligned with deduction. */
export function lineMatchesInventory(
  inv: InventoryItem,
  line: OrderItemLine
): boolean {
  const cookRule = (inv as { lineCookFilter?: string | null }).lineCookFilter;
  if (
    !inventoryLineCookFilterMatchesLine(
      normalizeInventoryLineCookFilter(cookRule),
      line.cookedOrFrozen
    )
  ) {
    return false;
  }

  const mode = normalizeInventoryDeductionMode(inv.deductionMode);

  if (mode === INVENTORY_DEDUCTION_ORDER_LINE_QTY) {
    if (line.isSample) return false;
    const mid = inv.menuItemId?.trim();
    const lid = line.menuItemId?.trim();
    if (!mid || !lid) return false;
    return mid === lid;
  }

  if (inv.menuItemId?.trim()) {
    return (
      line.menuItemId?.trim() === inv.menuItemId.trim() &&
      frozenLumpiaDozenUnits(line) > 0
    );
  }
  if (/lumpia/i.test(inv.itemName) && /frozen/i.test(inv.itemName)) {
    return frozenLumpiaDozenUnits(line) > 0;
  }
  return false;
}

/**
 * Units of `quantityInStock` consumed by these order lines for one inventory row
 * (respects `deductionMode` and linked menu SKU).
 */
export function computeInventoryStockUnits(
  inv: InventoryItem,
  lines: OrderItemLine[]
): number {
  const mode = normalizeInventoryDeductionMode(inv.deductionMode);
  let total = 0;
  for (const line of lines) {
    if (!lineMatchesInventory(inv, line)) continue;
    if (mode === INVENTORY_DEDUCTION_ORDER_LINE_QTY) {
      total += Math.max(0, Math.floor(Number(line.quantity)) || 0);
    } else if (mode === INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN) {
      total += lumpiaDozenUnitsForMatchedLine(inv, line);
    }
  }
  return total;
}

/** @deprecated Use `computeInventoryStockUnits` — name kept for older call sites. */
export const computeDozenUnitsForInventory = computeInventoryStockUnits;

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
    const units = computeInventoryStockUnits(inv, lines);
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
        note: `Decrement ${units} ${inv.unitLabel} unit(s)`,
      },
    });
    touchedIds.push(inv.id);
  }

  for (const id of new Set(touchedIds)) {
    await applyInventoryStockRulesInTx(tx, id);
  }
}
