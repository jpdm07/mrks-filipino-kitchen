/** Sum `OrderItemLine.quantity` for lines matching this inventory row’s linked menu SKU (flan, yema, trays, etc.). */
export const INVENTORY_DEDUCTION_ORDER_LINE_QTY = "order_line_qty";
/**
 * Lumpia per protein: map order sizes to pieces (12 / 24 / 50 / 4 sample).
 * Cooked and frozen share the same stock pool (`lineCookFilter` ignored).
 */
export const INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN = "lumpia_frozen_dozen";
/** Alias — same behavior as `lumpia_frozen_dozen`. */
export const INVENTORY_DEDUCTION_LUMPIA_PIECES = "lumpia_pieces";

export type InventoryDeductionMode =
  | typeof INVENTORY_DEDUCTION_ORDER_LINE_QTY
  | typeof INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN
  | typeof INVENTORY_DEDUCTION_LUMPIA_PIECES;

export function isLumpiaPiecesDeductionMode(
  mode: InventoryDeductionMode
): boolean {
  return (
    mode === INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN ||
    mode === INVENTORY_DEDUCTION_LUMPIA_PIECES
  );
}

export function normalizeInventoryDeductionMode(
  raw: string | null | undefined
): InventoryDeductionMode {
  const s = (raw ?? "").trim();
  if (
    s === INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN ||
    s === INVENTORY_DEDUCTION_LUMPIA_PIECES
  ) {
    return INVENTORY_DEDUCTION_LUMPIA_PIECES;
  }
  return INVENTORY_DEDUCTION_ORDER_LINE_QTY;
}

export function isValidDeductionMode(s: string): s is InventoryDeductionMode {
  return (
    s === INVENTORY_DEDUCTION_ORDER_LINE_QTY ||
    s === INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN ||
    s === INVENTORY_DEDUCTION_LUMPIA_PIECES
  );
}
