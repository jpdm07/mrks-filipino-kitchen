import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import type { OrderItemLine } from "@/lib/order-types";
import { AdminOrderPaymentPanel } from "@/components/admin/AdminOrderPaymentPanel";
import { AdminOrderDemoDeletePanel } from "@/components/admin/AdminOrderDemoDeletePanel";
import {
  getSauceCupsFromOrderLine,
  totalSauceCupsForItems,
} from "@/lib/menu-item-unit-costs";

function parseItems(raw: string): OrderItemLine[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as OrderItemLine[]) : [];
  } catch {
    return [];
  }
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const id = decodeURIComponent(params.id);
  const order = await prisma.order.findFirst({
    where: { OR: [{ orderNumber: id }, { id }] },
  });
  if (!order) notFound();

  const items = parseItems(order.items);

  return (
    <div>
      <Link href="/admin/dashboard" className="text-sm text-[var(--primary)] underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Order #{order.orderNumber}
      </h1>
      <p className="text-sm text-[var(--text-muted)]">
        {new Date(order.createdAt).toLocaleString()}
        {order.isDemo ? (
          <span className="ml-2 rounded bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-950">
            Demo
          </span>
        ) : null}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="font-bold">Customer</h2>
          <p>{order.customerName}</p>
          <p>
            <a href={`tel:${order.phone.replace(/\D/g, "")}`}>{order.phone}</a>
          </p>
          <p>{order.email}</p>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="font-bold">Pickup</h2>
          <p>
            {order.pickupDate} @ {order.pickupTime}
          </p>
          {order.wantsPrintedReceipt ? (
            <p className="mt-2 text-sm font-semibold text-[var(--text)]">
              Printed receipt requested — pack with order
            </p>
          ) : null}
          <p>Status: {order.status}</p>
          {order.paymentMethod ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Payment method (sheet): {order.paymentMethod}
            </p>
          ) : null}
          {order.paymentStatus ? (
            <p className="text-sm text-[var(--text-muted)]">
              Payment status: {order.paymentStatus}
            </p>
          ) : null}
        </div>
      </div>
      <AdminOrderPaymentPanel
        orderNumber={order.orderNumber}
        status={order.status}
      />
      <div className="mt-6 rounded border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="font-bold">Items</h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {items.map((i, idx) => {
            const cups = getSauceCupsFromOrderLine(i) * i.quantity;
            const sauceLabel =
              cups > 0
                ? `${cups} sauce cup${cups === 1 ? "" : "s"}`
                : "no sauce cups";
            return (
              <li key={idx}>
                {i.name} ×{i.quantity}
                {i.size ? ` · ${i.size}` : ""} → {sauceLabel}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">
          Total sauce cups to pack: {totalSauceCupsForItems(items)}
        </p>
        <p className="mt-2 text-sm">
          Utensils: {order.utensilSets} (${order.utensilCharge.toFixed(2)})
        </p>
        <p className="text-sm font-bold">
          Total: ${order.total.toFixed(2)}
        </p>
      </div>
      {order.notes ? (
        <p className="mt-4 text-sm">
          <strong>Notes:</strong> {order.notes}
        </p>
      ) : null}
      {order.customInquiry ? (
        <p className="mt-2 text-sm">
          <strong>Custom:</strong> {order.customInquiry}
        </p>
      ) : null}
      {order.adminNotes ? (
        <p className="mt-2 text-sm">
          <strong>Admin:</strong> {order.adminNotes}
        </p>
      ) : null}
      <AdminOrderDemoDeletePanel
        orderNumber={order.orderNumber}
        initialIsDemo={order.isDemo}
      />
    </div>
  );
}
