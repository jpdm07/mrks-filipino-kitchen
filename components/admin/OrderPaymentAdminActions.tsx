"use client";

import { useState } from "react";
import type { Order } from "@prisma/client";
import {
  ORDER_STATUS_AWAITING_PAYMENT,
  ORDER_STATUS_PENDING_PAYMENT_VERIFICATION,
} from "@/lib/order-payment";

export function OrderPaymentAdminActions({
  orderNumber,
  status,
  onDone,
}: {
  orderNumber: string;
  status: string;
  onDone?: (updated: Order) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (
    status !== ORDER_STATUS_PENDING_PAYMENT_VERIFICATION &&
    status !== ORDER_STATUS_AWAITING_PAYMENT
  ) {
    return null;
  }

  const run = async (paymentAction: "verify" | "not_received") => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentAction }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr((j as { error?: string }).error ?? "Update failed");
        return;
      }
      const updated = (await res.json()) as Order;
      onDone?.(updated);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-amber-300/80 bg-amber-50 p-4 dark:bg-amber-950/30">
      <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
        Payment verification
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Customer marked payment sent (Zelle/Venmo). Verify before you confirm pickup.
      </p>
      {err ? (
        <p className="mt-2 text-sm text-red-600">{err}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          onClick={() => run("verify")}
        >
          Payment verified
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded border border-amber-800/40 px-3 py-2 text-sm font-semibold disabled:opacity-50"
          onClick={() => run("not_received")}
        >
          Payment not received
        </button>
      </div>
    </div>
  );
}
