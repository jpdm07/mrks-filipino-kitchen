import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { DashboardOrders } from "@/components/admin/DashboardOrders";
import type { OrderItemLine } from "@/lib/order-types";

function summarize(raw: string): string {
  try {
    const items = JSON.parse(raw) as OrderItemLine[];
    if (!Array.isArray(items)) return "";
    return items
      .map((i) => `${i.name}${i.size ? ` (${i.size})` : ""} ×${i.quantity}`)
      .join(", ");
  } catch {
    return "";
  }
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const startDay = new Date(now);
  startDay.setHours(0, 0, 0, 0);
  const startWeek = new Date(now);
  startWeek.setDate(now.getDate() - now.getDay());
  startWeek.setHours(0, 0, 0, 0);

  const forMetrics = (o: (typeof orders)[0]) => !o.isDemo;
  const todayOrders = orders.filter(
    (o) => forMetrics(o) && o.createdAt >= startDay
  );
  const pending = orders.filter(
    (o) => o.status === "Pending Payment Verification"
  ).length;
  const weekRev = orders
    .filter(
      (o) =>
        forMetrics(o) && o.createdAt >= startWeek && o.status !== "Cancelled"
    )
    .reduce((s, o) => s + o.total, 0);
  const allRev = orders
    .filter((o) => forMetrics(o) && o.status !== "Cancelled")
    .reduce((s, o) => s + o.total, 0);

  const rows = orders.map((o) => ({
    ...o,
    itemsSummary: summarize(o.items),
  }));

  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Dashboard
      </h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">Orders today</p>
          <p className="text-2xl font-bold text-[var(--primary)]">
            {todayOrders.length}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">
            Pending payment check
          </p>
          <p className="text-2xl font-bold text-[var(--accent)]">{pending}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">Revenue this week</p>
          <p className="text-2xl font-bold text-[var(--primary)]">
            ${weekRev.toFixed(2)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">Revenue all time</p>
          <p className="text-2xl font-bold text-[var(--primary)]">
            ${allRev.toFixed(2)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Orders today, week revenue, and all-time revenue exclude demo/test orders.
        Mark demos on an order&apos;s page or delete them there.
      </p>
      <DashboardOrders initialOrders={rows} />
    </div>
  );
}
