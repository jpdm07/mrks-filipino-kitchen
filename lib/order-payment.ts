/** Order + payment lifecycle (Zelle / Venmo only — no card processing). */

export const ORDER_STATUS_PENDING_PAYMENT_VERIFICATION =
  "Pending Payment Verification";
export const ORDER_STATUS_CONFIRMED = "Confirmed";
export const ORDER_STATUS_AWAITING_PAYMENT = "Awaiting Payment";
/** Legacy / admin manual */
export const ORDER_STATUS_PENDING = "Pending";

export const PAYMENT_METHOD_UNVERIFIED = "Zelle or Venmo (unverified)";
export const PAYMENT_METHOD_VERIFIED_LABEL = "Verified";

export const PAYMENT_STATUS_PENDING = "Pending";
export const PAYMENT_STATUS_VERIFIED = "Verified";
export const PAYMENT_STATUS_NOT_RECEIVED = "Not Received";
export const PAYMENT_STATUS_PARTIALLY_REFUNDED = "Partially refunded";
export const PAYMENT_STATUS_REFUNDED = "Refunded";

/** Receipts / admin UI: avoid "Verified · Verified" when both fields match. */
export function formatPaymentDisplayLine(
  paymentMethod: string | null | undefined,
  paymentStatus: string | null | undefined
): string {
  const m = (paymentMethod ?? "").trim();
  const s = (paymentStatus ?? "").trim();
  if (!m && !s) return "—";
  if (!m) return s;
  if (!s) return m;
  if (m === s) return m;
  if (
    m === PAYMENT_METHOD_VERIFIED_LABEL &&
    (s === PAYMENT_STATUS_PARTIALLY_REFUNDED || s === PAYMENT_STATUS_REFUNDED)
  ) {
    return s;
  }
  return `${m} · ${s}`;
}
