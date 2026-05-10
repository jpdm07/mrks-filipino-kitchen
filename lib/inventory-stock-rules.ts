import type { Prisma } from "@prisma/client";

/**
 * After stock hits zero or low-stock threshold: hide from ordering + banner, close linked pickup slots.
 */
export async function applyInventoryStockRulesInTx(
  tx: Prisma.TransactionClient,
  inventoryItemId: number
): Promise<void> {
  const inv = await tx.inventoryItem.findUnique({
    where: { id: inventoryItemId },
  });
  if (!inv) return;

  const qty = Math.max(0, inv.quantityInStock);
  const thr = inv.lowStockThreshold;
  const hitZero = qty <= 0;
  const hitThreshold = thr != null && qty <= thr;

  const data: {
    quantityInStock?: number;
    isAvailable?: boolean;
    showBanner?: boolean;
  } = {};

  if (hitZero) {
    data.quantityInStock = 0;
    data.isAvailable = false;
    data.showBanner = false;
  } else if (hitThreshold) {
    data.isAvailable = false;
    data.showBanner = false;
  }

  if (Object.keys(data).length > 0) {
    await tx.inventoryItem.update({
      where: { id: inv.id },
      data,
    });
  }

  const closeSlots = hitZero || hitThreshold;
  if (closeSlots) {
    await tx.inventoryPickupSlot.updateMany({
      where: {
        inventoryItemId: inv.id,
        closed: false,
        autoCloseWhenZero: true,
      },
      data: { closed: true },
    });
  }
}
