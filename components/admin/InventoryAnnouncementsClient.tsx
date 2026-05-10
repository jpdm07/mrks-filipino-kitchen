"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  inventoryBannerAdminWarning,
  resolvedInventoryBannerMessage,
} from "@/lib/inventory-banner-copy";
import { pickupTimeSlotLabels } from "@/lib/pickup-time-slots";
import type { MenuItem } from "@prisma/client";
import { InventoryClient } from "@/components/admin/InventoryClient";

type DeductionLog = {
  id: number;
  createdAt: string;
  orderId: string;
  quantityDeducted: number;
  wasManualEntry: boolean;
  note: string | null;
};

export type InventoryRow = {
  id: number;
  menuItemId: string | null;
  itemName: string;
  unitLabel: string;
  quantityInStock: number;
  isAvailable: boolean;
  showBanner: boolean;
  bannerMessage: string | null;
  lowStockThreshold: number | null;
  updatedAt: string;
  deductionLogs: DeductionLog[];
};

export function InventoryAnnouncementsClient({
  initialInventory,
  menuItems,
  menuItemsFull,
}: {
  initialInventory: InventoryRow[];
  menuItems: { id: string; name: string }[];
  menuItemsFull: MenuItem[];
}) {
  const slotLabels = useMemo(() => pickupTimeSlotLabels(), []);
  const [items, setItems] = useState(initialInventory);
  const [toast, setToast] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Partial<InventoryRow>>>(
    () => ({})
  );
  const [modalId, setModalId] = useState<number | null>(null);
  const [slotForm, setSlotForm] = useState({
    datesText: "",
    startLabel: "11:00 AM",
    endLabel: "2:00 PM",
    maxOrders: 10,
    autoCloseWhenZero: true,
  });
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    itemName: "",
    unitLabel: "dozen",
    menuItemId: "",
  });

  const mergeRow = (row: InventoryRow): InventoryRow => {
    const d = drafts[row.id];
    return d ? { ...row, ...d } : row;
  };

  const save = async (row: InventoryRow) => {
    const d = drafts[row.id] ?? {};
    const payload = {
      quantityInStock:
        d.quantityInStock !== undefined ? d.quantityInStock : row.quantityInStock,
      isAvailable: d.isAvailable !== undefined ? d.isAvailable : row.isAvailable,
      showBanner: d.showBanner !== undefined ? d.showBanner : row.showBanner,
      bannerMessage:
        d.bannerMessage !== undefined ? d.bannerMessage : row.bannerMessage,
      lowStockThreshold:
        d.lowStockThreshold !== undefined ? d.lowStockThreshold : row.lowStockThreshold,
      itemName: d.itemName !== undefined ? d.itemName : row.itemName,
      unitLabel: d.unitLabel !== undefined ? d.unitLabel : row.unitLabel,
      menuItemId:
        d.menuItemId !== undefined ? d.menuItemId : row.menuItemId,
    };

    const res = await fetch(`/api/admin/inventory/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        bannerMessage: payload.bannerMessage || null,
        lowStockThreshold:
          payload.lowStockThreshold === null || payload.lowStockThreshold === undefined
            ? null
            : payload.lowStockThreshold,
        menuItemId: payload.menuItemId || null,
      }),
    });
    if (!res.ok) {
      setToast("Could not save — try again.");
      window.setTimeout(() => setToast(null), 4000);
      return;
    }
    const updated = (await res.json()) as InventoryRow;
    setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setDrafts((p) => {
      const n = { ...p };
      delete n[row.id];
      return n;
    });
    setToast("Saved inventory settings.");
    window.setTimeout(() => setToast(null), 4000);
  };

  const openSlots = async (row: InventoryRow) => {
    const datesYmd = slotForm.datesText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
    const res = await fetch(`/api/admin/inventory/${row.id}/open-slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        datesYmd,
        startLabel: slotForm.startLabel,
        endLabel: slotForm.endLabel,
        maxOrders: slotForm.maxOrders,
        autoCloseWhenZero: slotForm.autoCloseWhenZero,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      setToast(data.error ?? "Could not open slots.");
    } else {
      setToast("Pickup slots added to the calendar.");
      setModalId(null);
    }
    window.setTimeout(() => setToast(null), 5000);
  };

  const createItem = async () => {
    if (!newItem.itemName.trim() || !newItem.unitLabel.trim()) return;
    const res = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName: newItem.itemName.trim(),
        unitLabel: newItem.unitLabel.trim(),
        menuItemId: newItem.menuItemId || null,
      }),
    });
    if (!res.ok) {
      setToast("Could not add item.");
      window.setTimeout(() => setToast(null), 4000);
      return;
    }
    const row = (await res.json()) as InventoryRow;
    setItems((p) => [...p, { ...row, deductionLogs: [] }]);
    setNewItem({ itemName: "", unitLabel: "dozen", menuItemId: "" });
    setAdding(false);
    setToast("New inventory item created.");
    window.setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="mt-8 space-y-10">
      {toast ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--text)]">
          {toast}
        </p>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-lg text-[color:var(--primary)]">
            Inventory &amp; announcements
          </h2>
          <button
            type="button"
            className="rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold"
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? "Cancel" : "Add item"}
          </button>
        </div>

        {adding ? (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <input
              className="w-full rounded border px-2 py-2"
              placeholder="Item name (e.g. Pancit Party Tray)"
              value={newItem.itemName}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, itemName: e.target.value }))
              }
            />
            <input
              className="w-full rounded border px-2 py-2"
              placeholder="Unit label (e.g. tray, dozen)"
              value={newItem.unitLabel}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, unitLabel: e.target.value }))
              }
            />
            <select
              className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-2"
              value={newItem.menuItemId}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, menuItemId: e.target.value }))
              }
            >
              <option value="">Link menu item (optional)</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void createItem()}
            >
              Create inventory record
            </button>
          </div>
        ) : null}

        {items.map((row) => {
          const r = mergeRow(row);
          const previewMsg = resolvedInventoryBannerMessage({
            itemName: r.itemName,
            quantityInStock: r.quantityInStock,
            unitLabel: r.unitLabel,
            bannerMessage:
              typeof r.bannerMessage === "string" && r.bannerMessage.trim()
                ? r.bannerMessage.trim()
                : null,
          });
          const warn = inventoryBannerAdminWarning(r);

          return (
            <div
              key={row.id}
              className="grid gap-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 lg:grid-cols-2"
            >
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Item name
                  </label>
                  <input
                    className="mt-1 w-full rounded border px-2 py-2"
                    value={r.itemName}
                    onChange={(e) =>
                      setDrafts((p) => ({
                        ...p,
                        [row.id]: {
                          ...p[row.id],
                          itemName: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Unit label
                  </label>
                  <input
                    className="mt-1 w-full rounded border px-2 py-2"
                    value={r.unitLabel}
                    onChange={(e) =>
                      setDrafts((p) => ({
                        ...p,
                        [row.id]: { ...p[row.id], unitLabel: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Quantity in stock ({r.unitLabel})
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded border px-2 py-2"
                    value={r.quantityInStock}
                    onChange={(e) =>
                      setDrafts((p) => ({
                        ...p,
                        [row.id]: {
                          ...p[row.id],
                          quantityInStock: parseInt(e.target.value, 10) || 0,
                        },
                      }))
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.isAvailable}
                    onChange={(e) =>
                      setDrafts((p) => ({
                        ...p,
                        [row.id]: {
                          ...p[row.id],
                          isAvailable: e.target.checked,
                        },
                      }))
                    }
                  />
                  Mark as Available for Ordering
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.showBanner}
                    onChange={(e) =>
                      setDrafts((p) => ({
                        ...p,
                        [row.id]: {
                          ...p[row.id],
                          showBanner: e.target.checked,
                        },
                      }))
                    }
                  />
                  Show Announcement on Website
                </label>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Custom message (leave blank to auto-generate)
                  </label>
                  <textarea
                    className="mt-1 w-full rounded border px-2 py-2 text-sm"
                    rows={2}
                    value={r.bannerMessage ?? ""}
                    onChange={(e) =>
                      setDrafts((p) => ({
                        ...p,
                        [row.id]: {
                          ...p[row.id],
                          bannerMessage: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    Auto-close when stock drops to or below (optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded border px-2 py-2"
                    placeholder="e.g. 2"
                    value={
                      r.lowStockThreshold === null || r.lowStockThreshold === undefined
                        ? ""
                        : String(r.lowStockThreshold)
                    }
                    onChange={(e) => {
                      const t = e.target.value.trim();
                      setDrafts((p) => ({
                        ...p,
                        [row.id]: {
                          ...p[row.id],
                          lowStockThreshold:
                            t === "" ? null : Math.max(0, parseInt(t, 10) || 0),
                        },
                      }));
                    }}
                  />
                </div>
                <select
                  className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm"
                  value={r.menuItemId ?? ""}
                  onChange={(e) =>
                    setDrafts((p) => ({
                      ...p,
                      [row.id]: {
                        ...p[row.id],
                        menuItemId: e.target.value || null,
                      },
                    }))
                  }
                >
                  <option value="">Menu link (optional)</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => void save(row)}
                >
                  Save
                </button>
                {r.isAvailable && r.quantityInStock > 0 ? (
                  <button
                    type="button"
                    className="btn btn-gold btn-block"
                    onClick={() => {
                      setModalId(row.id);
                      setSlotForm((s) => ({ ...s }));
                    }}
                  >
                    Open Pickup Slots
                  </button>
                ) : null}
              </div>

              <div className="space-y-3 border-t border-[var(--border)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Live preview (customer site)
                </p>
                <div className="rounded-lg border border-[var(--gold-muted)]/50 bg-[rgba(251,246,236,0.97)] px-4 py-3 text-[color:var(--primary)]">
                  <p className="text-sm leading-snug">{previewMsg}</p>
                  <Link
                    href="/order"
                    className="btn btn-primary btn-sm mt-3 inline-flex"
                  >
                    Order for Pickup
                  </Link>
                </div>
                {warn ? (
                  <p className="text-sm font-medium text-[var(--accent)]">{warn}</p>
                ) : null}
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    Recent deductions
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                    {row.deductionLogs.length === 0 ? (
                      <li>None yet.</li>
                    ) : (
                      row.deductionLogs.map((log) => (
                        <li key={log.id}>
                          {new Date(log.createdAt).toLocaleString()} · Order{" "}
                          <Link
                            href={`/admin/orders/${log.orderId}`}
                            className="font-semibold text-[var(--primary)] underline"
                          >
                            {log.orderId.slice(0, 8)}…
                          </Link>{" "}
                          · −{log.quantityDeducted} {row.unitLabel}
                          {log.wasManualEntry ? " · manual" : " · website"}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {modalId !== null ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl">
            <h3 className="font-bold text-lg text-[color:var(--primary)]">
              Open pickup slots
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              One window per save. Dates must be YYYY-MM-DD, one per line. Times use
              the standard 15-minute pickup grid.
            </p>
            <label className="mt-4 block text-xs font-semibold">Dates</label>
            <textarea
              className="mt-1 w-full rounded border px-2 py-2 font-mono text-sm"
              rows={4}
              placeholder={"2026-05-10\n2026-05-11"}
              value={slotForm.datesText}
              onChange={(e) =>
                setSlotForm((s) => ({ ...s, datesText: e.target.value }))
              }
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold">Start</label>
                <select
                  className="mt-1 w-full rounded border px-2 py-2 text-sm"
                  value={slotForm.startLabel}
                  onChange={(e) =>
                    setSlotForm((s) => ({ ...s, startLabel: e.target.value }))
                  }
                >
                  {slotLabels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold">End</label>
                <select
                  className="mt-1 w-full rounded border px-2 py-2 text-sm"
                  value={slotForm.endLabel}
                  onChange={(e) =>
                    setSlotForm((s) => ({ ...s, endLabel: e.target.value }))
                  }
                >
                  {slotLabels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="mt-3 block text-xs font-semibold">
              Max orders this window
            </label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border px-2 py-2"
              value={slotForm.maxOrders}
              onChange={(e) =>
                setSlotForm((s) => ({
                  ...s,
                  maxOrders: Math.max(1, parseInt(e.target.value, 10) || 1),
                }))
              }
            />
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={slotForm.autoCloseWhenZero}
                onChange={(e) =>
                  setSlotForm((s) => ({
                    ...s,
                    autoCloseWhenZero: e.target.checked,
                  }))
                }
              />
              Automatically close this slot when inventory hits zero
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const row = items.find((x) => x.id === modalId);
                  if (row) void openSlots(row);
                }}
              >
                Save slots
              </button>
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => setModalId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section>
        <h2 className="font-bold text-lg text-[color:var(--primary)]">
          Menu items — sold out &amp; notes
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Same as before: quick flags per menu SKU (separate from quantity inventory
          above).
        </p>
        <InventoryClient initialItems={menuItemsFull} />
      </section>
    </div>
  );
}
