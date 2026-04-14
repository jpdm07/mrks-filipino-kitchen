"use client";

import { useRouter } from "next/navigation";
import { OrderPaymentAdminActions } from "./OrderPaymentAdminActions";

export function AdminOrderPaymentPanel({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: string;
}) {
  const router = useRouter();
  return (
    <OrderPaymentAdminActions
      orderNumber={orderNumber}
      status={status}
      onDone={() => {
        router.refresh();
      }}
    />
  );
}
