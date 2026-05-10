/** Sum `OrderItemLine.quantity` for lines matching this inventory row’s linked menu SKU (flan, yema, trays, etc.). */
export const INVENTORY_DEDUCTION_ORDER_LINE_QTY = "order_line_qty";
/** Frozen lumpia only: map size keys (1dz / 2dz / party) → dozen-style stock units. */
export const INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN = "lumpia_frozen_dozen";

export type InventoryDeductionMode =
  | typeof INVENTORY_DEDUCTION_ORDER_LINE_QTY
  | typeof INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN;

export function normalizeInventoryDeductionMode(
  raw: string | null | undefined
): InventoryDeductionMode {
  const s = (raw ?? "").trim();
  if (s === INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN) {
    return INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN;
  }
  return INVENTORY_DEDUCTION_ORDER_LINE_QTY;
}

export function isValidDeductionMode(s: string): s is InventoryDeductionMode {
  return (
    s === INVENTORY_DEDUCTION_ORDER_LINE_QTY ||
    s === INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN
  );
}
