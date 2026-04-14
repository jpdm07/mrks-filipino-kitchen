import { Suspense } from "react";
import { OrderForm } from "@/components/order/OrderForm";

export default function OrderPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense
        fallback={
          <p className="text-center text-[var(--text-muted)]">Loading checkout…</p>
        }
      >
        <OrderForm />
      </Suspense>
    </div>
  );
}
