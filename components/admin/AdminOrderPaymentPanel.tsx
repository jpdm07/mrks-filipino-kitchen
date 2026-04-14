"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderPaymentAdminActions } from "./OrderPaymentAdminActions";

export function AdminOrderPaymentPanel({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: string;
}) {
  const router = useRouter();
  const [savedHint, setSavedHint] = useState<string | null>(null);

  useEffect(() => {
    if (!savedHint) return;
    const t = window.setTimeout(() => setSavedHint(null), 4000);
    return () => window.clearTimeout(t);
  }, [savedHint]);

  return (
    <>
      <OrderPaymentAdminActions
        orderNumber={orderNumber}
        status={status}
        onDone={() => {
          router.refresh();
          setSavedHint("Payment status saved.");
        }}
      />
      {savedHint ? (
        <p
          className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
          role="status"
        >
          {savedHint}
        </p>
      ) : null}
    </>
  );
}
