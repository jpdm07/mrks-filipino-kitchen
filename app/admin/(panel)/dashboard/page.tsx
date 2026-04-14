import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { userFacingAdminDatabaseError } from "@/lib/safe-db";
import { DashboardOrders } from "@/components/admin/DashboardOrders";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  let orders: Awaited<ReturnType<typeof prisma.order.findMany>> = [];
  let unreadInquiries = 0;
  let dbError: string | null = null;
  try {
    orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    });
    unreadInquiries = await prisma.inquiry.count({
      where: { isRead: false },
    });
  } catch (e) {
    console.error("[admin/dashboard] prisma.order.findMany failed:", e);
    dbError = userFacingAdminDatabaseError(e);
  }

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

  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Dashboard
      </h1>
      {dbError ? (
        <p className="mt-4 whitespace-pre-wrap rounded-lg border border-[var(--accent)]/50 bg-[var(--gold-light)] px-4 py-3 text-sm font-medium leading-relaxed text-[var(--text)]">
          {dbError}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
        <Link
          href="/admin/inquiries"
          className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
        >
          Contact messages
        </Link>
        <span className="text-[var(--text-muted)]">
          — website contact form
        </span>
        {unreadInquiries > 0 ? (
          <span className="rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-xs font-bold text-white">
            {unreadInquiries} unread
          </span>
        ) : null}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <Link
          href="/admin/inquiries"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:border-[var(--primary)]/40 hover:ring-1 hover:ring-[var(--primary)]/15"
        >
          <p className="text-sm text-[var(--text-muted)]">
            Unread contact messages
          </p>
          <p className="text-2xl font-bold text-[var(--primary)]">
            {unreadInquiries}
          </p>
          <p className="mt-1 text-xs font-medium text-[var(--primary)]">
            Open inquiries →
          </p>
        </Link>
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
        Revenue cards exclude orders marked <strong>Demo / test</strong>. To drop
        dummy checkouts from totals, use <strong>Delete</strong> on a row (or open{" "}
        <strong>Details</strong> → <strong>Delete permanently</strong>) — or mark
        the order as demo. Full order page also has delete under &quot;Remove test
        orders.&quot;
      </p>
      {/*
        Order rows load via GET /api/admin/orders on the client so Prisma objects
        never cross the RSC → client boundary (avoids production Flight errors).
      */}
      <DashboardOrders />
    </div>
  );
}
