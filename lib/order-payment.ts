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
