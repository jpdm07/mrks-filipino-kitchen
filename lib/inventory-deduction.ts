import type { Prisma } from "@prisma/client";
import type { InventoryItem } from "@prisma/client";
import type { OrderItemLine } from "@/lib/order-types";
import { LUMPIA_MENU_ITEM_IDS } from "@/lib/inventory-constants";
import { applyInventoryStockRulesInTx } from "@/lib/inventory-stock-rules";

const lumpiaFrozenIds = new Set<string>(LUMPIA_MENU_ITEM_IDS);

/**
 * Map order line to dozen-units for frozen lumpia inventory.
 * // TODO: map order quantity options to inventory units for non-lumpia SKUs when added.
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

function lineMatchesInventory(inv: InventoryItem, line: OrderItemLine): boolean {
  if (inv.menuItemId?.trim()) {
    return line.menuItemId?.trim() === inv.menuItemId.trim();
  }
  /** Seeded Lumpia (Frozen) without explicit menu link — all frozen lumpia variants. */
  if (/lumpia/i.test(inv.itemName) && /frozen/i.test(inv.itemName)) {
    return frozenLumpiaDozenUnits(line) > 0;
  }
  return false;
}

export function computeDozenUnitsForInventory(
  inv: InventoryItem,
  lines: OrderItemLine[]
): number {
  let total = 0;
  for (const line of lines) {
    if (!lineMatchesInventory(inv, line)) continue;
    if (inv.menuItemId?.trim()) {
      const sk = (line.sizeKey ?? "").toLowerCase();
      const q = Math.max(0, Math.floor(Number(line.quantity)) || 0);
      if (sk.includes("2dz")) total += q * 2;
      else if (sk.includes("1dz")) total += q * 1;
      else if (sk.includes("party")) total += Math.ceil(q * (50 / 12));
      else total += q;
    } else {
      total += frozenLumpiaDozenUnits(line);
    }
  }
  return total;
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
    const units = computeDozenUnitsForInventory(inv, lines);
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
