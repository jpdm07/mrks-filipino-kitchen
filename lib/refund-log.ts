export type RefundLineChange = {
  index: number;
  name: string;
  qtyRemoved: number;
  lineRefundUsd: number;
};

export type RefundLedgerEntry = {
  id: string;
  at: string;
  sentVia: "venmo" | "zelle" | "cashapp" | "cash" | "other";
  refundTotalUsd: number;
  priorTotalUsd: number;
  newTotalUsd: number;
  lineChanges: RefundLineChange[];
  utensilSetsBefore: number;
  utensilSetsAfter: number;
  utensilRefundUsd: number;
  customerNote?: string;
};

export function parseRefundLog(raw: string | null | undefined): RefundLedgerEntry[] {
  if (raw == null || raw.trim() === "") return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as RefundLedgerEntry[]) : [];
  } catch {
    return [];
  }
}

export function stringifyRefundLog(entries: RefundLedgerEntry[]): string {
  return JSON.stringify(entries);
}

export function refundSentViaLabel(
  sentVia: RefundLedgerEntry["sentVia"]
): string {
  switch (sentVia) {
    case "venmo":
      return "Venmo";
    case "zelle":
      return "Zelle";
    case "cashapp":
      return "Cash App";
    case "cash":
      return "Cash";
    default:
      return "Other";
  }
}
