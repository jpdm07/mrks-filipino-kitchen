"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSauceCupsFromOrderLine,
  totalSauceCupsForItems,
} from "@/lib/menu-item-unit-costs";
import Link from "next/link";
import type { OrderItemLine } from "@/lib/order-types";
import type { AdminOrderClientRow } from "@/lib/admin-order-client";
import { OrderPaymentAdminActions } from "./OrderPaymentAdminActions";
import {
  ORDER_STATUS_PENDING_PAYMENT_VERIFICATION,
  formatPaymentDisplayLine,
} from "@/lib/order-payment";
import { AdminOrderReceiptActions } from "@/components/admin/AdminOrderReceiptActions";
import { ADMIN_POLL_INTERVAL_MS } from "@/lib/admin-poll-interval";

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
  const router = useRouter();
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [demoFilter, setDemoFilter] = useState<"all" | "hide" | "only">("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<Row | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [modalMounted, setModalMounted] = useState(false);
  const [modalNotice, setModalNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const closeModal = useCallback(() => {
    setModal(null);
    setModalNotice(null);
  }, []);

  const openModal = (o: Row) => {
    setModalNotice(null);
    setModal(o);
    setAdminNotes(o.adminNotes ?? "");
  };

  useEffect(() => setModalMounted(true), []);

  useEffect(() => {
    if (!modalNotice) return;
    const t = window.setTimeout(() => setModalNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [modalNotice]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modal, closeModal]);

  const loadOrders = useCallback(async (silent: boolean) => {
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const r = await fetch("/api/admin/orders", { credentials: "same-origin" });
      if (r.status === 401) {
        setLoadError("Session expired — refresh and sign in again.");
        return;
      }
      if (!r.ok) throw new Error("Could not load orders.");
      const data = (await r.json()) as { orders: Row[] };
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setLoadError(null);
    } catch (e: unknown) {
      if (!silent) {
        setLoadError(e instanceof Error ? e.message : "Could not load orders.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders(false);
  }, [loadOrders]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (modal) return;
      void loadOrders(true);
    }, ADMIN_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [loadOrders, modal]);

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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, demoFilter, q]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id));
  const someFilteredSelected = filtered.some((o) => selectedIds.has(o.id));

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) {
      el.indeterminate = someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

  const selectedCount = useMemo(
    () => orders.filter((o) => selectedIds.has(o.id)).length,
    [orders, selectedIds]
  );

  const toggleRowSelected = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (filtered.length > 0 && filtered.every((o) => n.has(o.id))) {
        filtered.forEach((o) => n.delete(o.id));
      } else {
        filtered.forEach((o) => n.add(o.id));
      }
      return n;
    });
  };

  const bulkDeleteSelected = async () => {
    const ids = orders.filter((o) => selectedIds.has(o.id)).map((o) => o.id);
    if (ids.length === 0) return;

    const rows = orders.filter((o) => selectedIds.has(o.id));
    const nums = rows.map((o) => o.orderNumber);
    const head = nums.slice(0, 15);
    const tail = nums.length > 15 ? `\n… and ${nums.length - 15} more` : "";
    const list = head.map((n) => `#${n}`).join("\n");

    /** Every order in the DB is selected — use delete-all (no 500-row bulk cap). */
    const deletingEntireDatabase =
      ids.length === orders.length && orders.length > 0;

    if (deletingEntireDatabase) {
      const typed = window.prompt(
        `Delete ALL ${orders.length} order(s) from the database permanently? This cannot be undone.\n\nType exactly: DELETE ALL ORDERS`
      );
      if (typed?.trim() !== "DELETE ALL ORDERS") {
        if (typed != null) {
          window.alert(
            'Cancelled — you must type the phrase exactly: DELETE ALL ORDERS'
          );
        }
        return;
      }
    } else if (
      !window.confirm(
        `Permanently delete ${ids.length} order(s)? They will disappear from the dashboard, finances, and lists. This cannot be undone.\n\n${list}${tail}`
      )
    ) {
      return;
    }

    setBulkDeleting(true);
    try {
      if (deletingEntireDatabase) {
        const res = await fetch("/api/admin/orders/delete-all", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: "DELETE ALL ORDERS" }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          deleted?: number;
        };
        if (!res.ok) {
          window.alert(data.error ?? "Could not delete all orders.");
          return;
        }
        setOrders([]);
        setSelectedIds(new Set());
        closeModal();
        router.refresh();
        return;
      }

      const res = await fetch("/api/admin/orders/bulk-delete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
      };
      if (!res.ok) {
        window.alert(data.error ?? "Bulk delete failed. Try again.");
        return;
      }
      const deleted = typeof data.deleted === "number" ? data.deleted : ids.length;
      const idSet = new Set(ids);
      setOrders((prev) => prev.filter((o) => !idSet.has(o.id)));
      setSelectedIds(new Set());
      if (modal && idSet.has(modal.id)) closeModal();
      router.refresh();
      if (deleted < ids.length) {
        window.alert(
          `Removed ${deleted} order(s). Some rows may have already been deleted.`
        );
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  const patchOrder = async (
    id: string,
    patch: object,
    options?: { successMessage?: string }
  ): Promise<boolean> => {
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
      router.refresh();
      if (options?.successMessage) {
        setModalNotice({ type: "success", text: options.successMessage });
      }
      return true;
    }
    if (modal?.id === id || options?.successMessage) {
      setModalNotice({
        type: "error",
        text: "Could not save. Try again.",
      });
    }
    return false;
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
      if (modal?.id === o.id) closeModal();
      router.refresh();
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
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {selectedCount > 0 ? (
            <span className="font-semibold text-[var(--text)]">
              {selectedCount} selected
            </span>
          ) : (
            <>
              Tick rows to select, or use the header box to select everyone in
              your current filter.
            </>
          )}
        </p>
        {selectedCount > 0 ? (
          <button
            type="button"
            disabled={bulkDeleting}
            className="min-h-[44px] shrink-0 rounded-lg border-2 border-[var(--accent)] bg-[var(--gold-light)] px-4 text-sm font-bold text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:pointer-events-none disabled:opacity-50"
            onClick={() => void bulkDeleteSelected()}
          >
            {bulkDeleting ? "Deleting…" : `Delete selected (${selectedCount})`}
          </button>
        ) : null}
      </div>
      <p className="mb-3 text-xs text-[var(--text-muted)]">
        To remove <strong>every</strong> order: set filters so all orders appear, tick the
        header checkbox, then <strong>Delete selected</strong>. You will be asked to type{" "}
        <kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1 font-mono">
          DELETE ALL ORDERS
        </kbd>{" "}
        exactly.
      </p>
      <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="bg-[var(--primary)] text-white">
            <tr>
              <th className="w-10 px-2 py-2">
                <input
                  ref={selectAllCheckboxRef}
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  disabled={filtered.length === 0 || bulkDeleting}
                  aria-label="Select all orders in the current filtered list"
                  className="h-4 w-4 align-middle"
                />
              </th>
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
                <td className="px-2 py-2 align-middle">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(o.id)}
                    onChange={() => toggleRowSelected(o.id)}
                    disabled={bulkDeleting}
                    aria-label={`Select order ${o.orderNumber}`}
                    className="h-4 w-4"
                  />
                </td>
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

      {modal && modalMounted
        ? createPortal(
            <div
              className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-black/55 p-3 sm:p-4"
              style={{ zIndex: 2147483646 }}
              role="presentation"
              onClick={closeModal}
            >
              <div
                className="my-auto flex w-full max-w-lg flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="flex items-center justify-between gap-3 rounded-t-xl border-b border-white/25 bg-[#0038A8] px-4 py-3 text-white"
                >
                  <h2
                    id="order-detail-title"
                    className="min-w-0 text-base font-bold leading-tight"
                  >
                    Order #{modal.orderNumber}
                  </h2>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border-2 border-white/80 bg-white/10 text-xl font-bold text-white hover:bg-white/20"
                    aria-label="Close order details"
                  >
                    ✕
                  </button>
                </div>
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="order-detail-title"
                  className="max-h-[min(78vh,680px)] overflow-y-auto rounded-b-xl border border-t-0 border-[var(--border)] bg-[var(--card)] p-5"
                >
            {modalNotice ? (
              <p
                className={`mb-3 rounded-lg px-3 py-2 text-sm font-semibold ${
                  modalNotice.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border border-red-200 bg-red-50 text-red-800"
                }`}
                role="status"
              >
                {modalNotice.text}
              </p>
            ) : null}
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
            {modal.paymentStatus || modal.paymentMethod ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Payment:{" "}
                {formatPaymentDisplayLine(
                  modal.paymentMethod,
                  modal.paymentStatus
                )}
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
                router.refresh();
                setModalNotice({
                  type: "success",
                  text: "Payment status saved.",
                });
              }}
            />
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={modal.isDemo}
                onChange={(e) => {
                  const v = e.target.checked;
                  void patchOrder(modal.id, { isDemo: v }, {
                    successMessage: "Demo / test flag saved.",
                  });
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
                onClick={() =>
                  void patchOrder(
                    modal.id,
                    { adminNotes },
                    { successMessage: "Admin notes saved." }
                  )
                }
              >
                Save notes
              </button>
              <AdminOrderReceiptActions
                order={modal}
                onNotice={setModalNotice}
              />
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
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-5 w-full min-h-12 rounded-xl border-2 border-[var(--border)] bg-[var(--bg-section)] text-sm font-bold text-[var(--text)] hover:bg-[var(--gold-light)]"
                  >
                    Close window
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
