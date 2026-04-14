"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSauceCupsFromOrderLine,
  totalSauceCupsForItems,
} from "@/lib/menu-item-unit-costs";
import Link from "next/link";
import type { OrderItemLine } from "@/lib/order-types";
import type { AdminOrderClientRow } from "@/lib/admin-order-client";
import { OrderPaymentAdminActions } from "./OrderPaymentAdminActions";
import { ORDER_STATUS_PENDING_PAYMENT_VERIFICATION } from "@/lib/order-payment";

type Row = AdminOrderClientRow;

const STATUSES = [
  "Pending Payment Verification",
  "Awaiting Payment",
  "Pending",
  "Confirmed",
  "Ready",
  "Completed",
  "Cancelled",
] as const;

function parseItems(raw: string): OrderItemLine[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as OrderItemLine[]) : [];
  } catch {
    return [];
  }
}

function sortOrders(list: Row[]): Row[] {
  return [...list].sort((a, b) => {
    const ta =
      a.status === ORDER_STATUS_PENDING_PAYMENT_VERIFICATION ? 0 : 1;
    const tb =
      b.status === ORDER_STATUS_PENDING_PAYMENT_VERIFICATION ? 0 : 1;
    if (ta !== tb) return ta - tb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function DashboardOrders() {
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [demoFilter, setDemoFilter] = useState<"all" | "hide" | "only">("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<Row | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch("/api/admin/orders", { credentials: "same-origin" })
      .then(async (r) => {
        if (r.status === 401) {
          throw new Error("Session expired — refresh and sign in again.");
        }
        if (!r.ok) throw new Error("Could not load orders.");
        return r.json() as Promise<{ orders: Row[] }>;
      })
      .then((data) => {
        if (!cancelled) setOrders(Array.isArray(data.orders) ? data.orders : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Could not load orders.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => sortOrders(orders), [orders]);

  const filtered = useMemo(() => {
    return sorted.filter((o) => {
      if (demoFilter === "hide" && o.isDemo) return false;
      if (demoFilter === "only" && !o.isDemo) return false;
      if (statusFilter !== "All" && o.status !== statusFilter) return false;
      if (!q.trim()) return true;
      const n = q.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(n) ||
        o.customerName.toLowerCase().includes(n)
      );
    });
  }, [sorted, statusFilter, demoFilter, q]);

  const openModal = (o: Row) => {
    setModal(o);
    setAdminNotes(o.adminNotes ?? "");
  };

  const patchOrder = async (id: string, patch: object) => {
    const num = orders.find((x) => x.id === id)?.orderNumber ?? id;
    const res = await fetch(`/api/orders/${encodeURIComponent(num)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = (await res.json()) as Partial<Row> & { id: string };
      setOrders((prev) =>
        prev.map((x) =>
          x.id === updated.id
            ? { ...x, ...updated, itemsSummary: x.itemsSummary }
            : x
        )
      );
      if (modal && modal.id === updated.id) {
        setModal({ ...modal, ...updated, items: modal.items });
      }
    }
  };

  const resend = async () => {
    if (!modal) return;
    await fetch(
      `/api/orders/${encodeURIComponent(modal.orderNumber)}?action=resend-sms`,
      { method: "POST", credentials: "same-origin" }
    );
  };

  const deleteOrderByRow = async (o: Row) => {
    if (
      !window.confirm(
        `Delete order #${o.orderNumber} permanently? It will disappear from the dashboard, finances, and lists. This cannot be undone.`
      )
    ) {
      return;
    }
    const res = await fetch(
      `/api/orders/${encodeURIComponent(o.orderNumber)}`,
      { method: "DELETE", credentials: "same-origin" }
    );
    if (res.ok) {
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
      if (modal?.id === o.id) setModal(null);
    } else {
      window.alert("Could not delete order. Try again or open the full order page.");
    }
  };

  const deleteOrder = async () => {
    if (!modal) return;
    await deleteOrderByRow(modal);
  };

  if (loading) {
    return (
      <div className="mt-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
        Loading orders…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-10 rounded-lg border border-[var(--accent)]/40 bg-[var(--gold-light)] px-4 py-4 text-sm font-medium text-[var(--text)]">
        {loadError}
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          placeholder="Search order # or customer"
          className="min-h-[44px] w-full max-w-md rounded-lg border border-[var(--border)] px-3 md:w-auto"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="min-h-[44px] rounded-lg border border-[var(--border)] px-3"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="min-h-[44px] rounded-lg border border-[var(--border)] px-3"
          value={demoFilter}
          onChange={(e) =>
            setDemoFilter(e.target.value as "all" | "hide" | "only")
          }
        >
          <option value="all">All orders</option>
          <option value="hide">Hide demos</option>
          <option value="only">Demos only</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-[var(--primary)] text-white">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Items</th>
              <th className="px-3 py-2">Utensils</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-mono text-xs">
                  {o.orderNumber}
                  {o.isDemo ? (
                    <span className="ml-1 rounded bg-amber-200 px-1 py-0.5 text-[10px] font-bold text-amber-950">
                      DEMO
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(o.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">{o.customerName}</td>
                <td className="max-w-[200px] truncate px-3 py-2" title={o.itemsSummary}>
                  {o.itemsSummary}
                </td>
                <td className="px-3 py-2">
                  {o.utensilSets != null ? o.utensilSets : "None"}
                </td>
                <td className="px-3 py-2 font-semibold">${o.total.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {o.status === ORDER_STATUS_PENDING_PAYMENT_VERIFICATION ? (
                      <span
                        className="shrink-0 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase text-black"
                        title="Verify Zelle/Venmo before confirming pickup"
                      >
                        Pay
                      </span>
                    ) : null}
                    <select
                      className="min-h-[40px] min-w-[8rem] flex-1 rounded border px-1"
                      value={o.status}
                      onChange={(e) => patchOrder(o.id, { status: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button
                      type="button"
                      className="text-[var(--primary)] underline"
                      onClick={() => openModal(o)}
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/40"
                      onClick={() => void deleteOrderByRow(o)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius)] bg-[var(--card)] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-bold text-lg">Order #{modal.orderNumber}</h2>
              <button type="button" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {new Date(modal.createdAt).toLocaleString()}
            </p>
            <p className="mt-4">
              <strong>{modal.customerName}</strong>
              <br />
              <a href={`tel:${modal.phone.replace(/\D/g, "")}`}>{modal.phone}</a>
              <br />
              {modal.email}
            </p>
            <ul className="mt-4 list-disc pl-5 text-sm">
              {parseItems(modal.items).map((i, idx) => {
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
              Total sauce cups to pack:{" "}
              {totalSauceCupsForItems(parseItems(modal.items))}
            </p>
            <p className="mt-2 text-sm">
              Utensils: {modal.utensilSets} sets (${modal.utensilCharge.toFixed(2)})
            </p>
            <p className="mt-2 text-sm">
              Pickup: {modal.pickupDate} @ {modal.pickupTime}
            </p>
            {modal.paymentStatus ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Payment: {modal.paymentMethod ?? "—"} · {modal.paymentStatus}
              </p>
            ) : null}
            {modal.notes ? (
              <p className="mt-2 text-sm">
                <strong>Notes:</strong> {modal.notes}
              </p>
            ) : null}
            {modal.customInquiry ? (
              <p className="mt-2 text-sm">
                <strong>Custom:</strong> {modal.customInquiry}
              </p>
            ) : null}
            <OrderPaymentAdminActions
              orderNumber={modal.orderNumber}
              status={modal.status}
              onDone={(updated) => {
                setOrders((prev) =>
                  prev.map((x) =>
                    x.id === updated.id
                      ? { ...x, ...updated, itemsSummary: x.itemsSummary }
                      : x
                  )
                );
                setModal({ ...modal, ...updated });
              }}
            />
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={modal.isDemo}
                onChange={(e) => {
                  const v = e.target.checked;
                  void patchOrder(modal.id, { isDemo: v });
                }}
              />
              <span>
                <span className="font-semibold">Demo / test</span> — excluded
                from finances &amp; dashboard revenue
              </span>
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Admin notes (internal)
              <textarea
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
                onClick={() => patchOrder(modal.id, { adminNotes })}
              >
                Save notes
              </button>
              <button
                type="button"
                className="rounded border px-4 py-2 text-sm font-semibold"
                onClick={resend}
              >
                Resend SMS
              </button>
              <button
                type="button"
                className="rounded border-2 border-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent)]"
                onClick={() => void deleteOrder()}
              >
                Delete permanently
              </button>
              <Link
                href={`/admin/orders/${encodeURIComponent(modal.orderNumber)}`}
                className="rounded border px-4 py-2 text-sm font-semibold"
              >
                Full page
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
