"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  inventoryBannerAdminWarning,
  resolvedInventoryBannerMessage,
} from "@/lib/inventory-banner-copy";
import {
  INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN,
  INVENTORY_DEDUCTION_ORDER_LINE_QTY,
} from "@/lib/inventory-deduction-modes";
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
  /** `order_line_qty` | `lumpia_frozen_dozen` — controls how checkout deducts stock */
  deductionMode?: string;
  updatedAt: string;
  deductionLogs: DeductionLog[];
};

export function InventoryAnnouncementsClient({
  initialInventory,
  menuItems,
  menuItemsFull,
  initialScheduling,
}: {
  initialInventory: InventoryRow[];
  menuItems: { id: string; name: string }[];
  menuItemsFull: MenuItem[];
  initialScheduling: {
    schedulingBannerForceStateA: boolean;
    qualifyingSameDayCount: number;
  };
}) {
  const slotLabels = useMemo(() => pickupTimeSlotLabels(), []);
  const [items, setItems] = useState(initialInventory);
  const [forceStateA, setForceStateA] = useState(
    initialScheduling.schedulingBannerForceStateA
  );
  const [qualifyingSameDayCount, setQualifyingSameDayCount] = useState(
    initialScheduling.qualifyingSameDayCount
  );
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
  /** Open “Add item” by default when there is nothing to edit yet (shows quantity immediately). */
  const [adding, setAdding] = useState(() => initialInventory.length === 0);
  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState({
    itemName: "",
    unitLabel: "dozen",
    menuItemId: "",
    quantityInStock: 0,
    isAvailable: false,
    showBanner: false,
    deductionMode: INVENTORY_DEDUCTION_ORDER_LINE_QTY as string,
  });

  const effectiveSchedulingState =
    !forceStateA && qualifyingSameDayCount > 0 ? "B" : "A";

  const schedulingPreview = useMemo(() => {
    if (forceStateA) {
      return "Override is on — customers see State A (advance scheduling only), even if items qualify for same-day.";
    }
    if (qualifyingSameDayCount === 0) {
      return 'No rows qualify (need “show announcement”, “available for ordering”, and stock > 0) — customers see State A.';
    }
    return `${qualifyingSameDayCount} qualifying item(s) — customers see State B: softer headline plus those items below it.`;
  }, [forceStateA, qualifyingSameDayCount]);

  const saveSchedulingOverride = async (next: boolean) => {
    const res = await fetch("/api/admin/scheduling-banner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedulingBannerForceStateA: next }),
    });
    if (!res.ok) {
      setToast("Could not save scheduling banner.");
      window.setTimeout(() => setToast(null), 4000);
      return;
    }
    const data = (await res.json()) as {
      schedulingBannerForceStateA: boolean;
      qualifyingSameDayCount: number;
      effectiveState: string;
    };
    setForceStateA(data.schedulingBannerForceStateA);
    setQualifyingSameDayCount(data.qualifyingSameDayCount);
    setToast("Scheduling banner settings saved.");
    window.setTimeout(() => setToast(null), 4000);
  };

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
      deductionMode:
        d.deductionMode !== undefined
          ? d.deductionMode
          : row.deductionMode ?? INVENTORY_DEDUCTION_ORDER_LINE_QTY,
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
        deductionMode: payload.deductionMode,
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
    if (!newItem.itemName.trim() || !newItem.unitLabel.trim()) {
      setToast("Enter both item name and unit label (e.g. dozen or ramekin).");
      window.setTimeout(() => setToast(null), 5000);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: newItem.itemName.trim(),
          unitLabel: newItem.unitLabel.trim(),
          menuItemId: newItem.menuItemId || null,
          quantityInStock: newItem.quantityInStock,
          isAvailable: newItem.isAvailable,
          showBanner: newItem.showBanner,
          deductionMode:
            newItem.deductionMode ?? INVENTORY_DEDUCTION_ORDER_LINE_QTY,
        }),
      });

      let parsed: unknown = null;
      try {
        parsed = await res.json();
      } catch {
        parsed = null;
      }

      if (!res.ok) {
        const msg =
          parsed &&
          typeof parsed === "object" &&
          "error" in parsed &&
          typeof (parsed as { error?: string }).error === "string"
            ? (parsed as { error: string }).error
            : `Could not add item (HTTP ${res.status}).`;
        setToast(msg);
        window.setTimeout(() => setToast(null), 8000);
        return;
      }

      const row = parsed as InventoryRow;
      setItems((p) => [...p, { ...row, deductionLogs: [] }]);
      setNewItem({
        itemName: "",
        unitLabel: "dozen",
        menuItemId: "",
        quantityInStock: 0,
        isAvailable: false,
        showBanner: false,
        deductionMode: INVENTORY_DEDUCTION_ORDER_LINE_QTY,
      });
      setAdding(false);
      setToast("New inventory item created.");
      window.setTimeout(() => setToast(null), 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error — try again.";
      setToast(msg);
      window.setTimeout(() => setToast(null), 6000);
    } finally {
      setCreating(false);
    }
  };

  const deleteItem = async (row: InventoryRow) => {
    if (
      !window.confirm(
        `Remove "${row.itemName}" from inventory? Pickup slots and deduction logs for this row are removed. This cannot be undone.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/inventory/${row.id}`, {
      method: "DELETE",
    });
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      const msg =
        parsed &&
        typeof parsed === "object" &&
        "error" in parsed &&
        typeof (parsed as { error?: string }).error === "string"
          ? (parsed as { error: string }).error
          : `Could not delete (HTTP ${res.status}).`;
      setToast(msg);
      window.setTimeout(() => setToast(null), 6000);
      return;
    }
    setItems((p) => {
      const next = p.filter((x) => x.id !== row.id);
      if (next.length === 0) {
        queueMicrotask(() => setAdding(true));
      }
      return next;
    });
    setDrafts((p) => {
      const n = { ...p };
      delete n[row.id];
      return n;
    });
    setToast("Inventory row removed.");
    window.setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="mt-8 space-y-10">
      {toast ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--text)]">
          {toast}
        </p>
      ) : null}

      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <h2 className="font-bold text-lg text-[color:var(--primary)]">
          Scheduling banner
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Controls the site-wide strip above the navigation: advance notice vs. same-day
          inventory messaging.
        </p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm">
          <p className="font-semibold text-[color:var(--primary)]">
            Active view: State {effectiveSchedulingState}
          </p>
          <p className="mt-1 text-[var(--text-muted)]">{schedulingPreview}</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={forceStateA}
            onChange={(e) => void saveSchedulingOverride(e.target.checked)}
          />
          <span>
            <span className="font-semibold">Override — force State A</span> even when
            items are in stock (temporary same-day blackout without changing counts).
          </span>
        </label>
      </section>

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
        <p className="rounded-lg border border-[color:var(--gold-muted)] bg-[color:rgba(212,169,68,0.12)] px-3 py-2 text-sm text-[var(--text)]">
          <span className="font-semibold text-[color:var(--primary)]">
            Quantity in stock
          </span>{" "}
          is the number field at the{" "}
          <strong>top of each card below</strong>, or at the top of the{" "}
          <strong>Add item</strong> form. It is{" "}
          <strong>not</strong> in &quot;Menu items — sold out&quot; at the bottom of this
          page.
        </p>

        {!adding && items.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-[color:var(--gold-muted)] bg-[var(--bg)] px-4 py-4 text-sm text-[var(--text)]">
            <p className="font-semibold text-[color:var(--primary)]">
              No inventory rows yet
            </p>
            <p className="mt-2 text-[var(--text-muted)]">
              Click <strong className="text-[var(--text)]">Add item</strong>, enter e.g.{" "}
              <strong>Lumpia (Frozen)</strong> and unit <strong>dozen</strong>, then create
              the record. You&apos;ll then see <strong>Quantity in stock</strong>, toggles,
              and banner fields on that card.
            </p>
          </div>
        ) : null}

        {adding ? (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <p className="font-semibold text-[color:var(--primary)]">Add inventory item</p>
            <div
              id="admin-inventory-quantity-new"
              className="rounded-lg border-2 border-[color:var(--gold)] bg-[var(--bg)] p-3 shadow-sm"
            >
              <label
                htmlFor="new-qty-stock"
                className="block text-sm font-bold uppercase tracking-wide text-[color:var(--primary)]"
              >
                Quantity in stock
              </label>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                How many{" "}
                <strong className="text-[var(--text)]">
                  {newItem.unitLabel.trim() || "units"}
                </strong>{" "}
                you have on hand (match the unit label — ramekins, pieces, dozens, etc.).
              </p>
              <input
                id="new-qty-stock"
                type="number"
                min={0}
                inputMode="numeric"
                autoComplete="off"
                className="mt-2 w-full rounded border-2 border-[color:var(--border)] bg-[var(--card)] px-3 py-3 text-lg font-semibold tabular-nums text-[color:var(--primary)]"
                value={newItem.quantityInStock}
                onChange={(e) =>
                  setNewItem((s) => ({
                    ...s,
                    quantityInStock: parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
            <input
              className="w-full rounded border px-2 py-2"
              placeholder="Item name (e.g. Lumpia (Frozen))"
              value={newItem.itemName}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, itemName: e.target.value }))
              }
            />
            <input
              className="w-full rounded border px-2 py-2"
              placeholder="Unit label (e.g. dozen, ramekin, piece)"
              value={newItem.unitLabel}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, unitLabel: e.target.value }))
              }
            />
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                How checkout reduces stock
              </label>
              <select
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm"
                value={newItem.deductionMode}
                onChange={(e) =>
                  setNewItem((s) => ({ ...s, deductionMode: e.target.value }))
                }
              >
                <option value={INVENTORY_DEDUCTION_ORDER_LINE_QTY}>
                  Per menu item — subtract cart line quantity (flan, yema, pancit, …)
                </option>
                <option value={INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN}>
                  Frozen lumpia — map sizes to dozens (1dz / 2dz / party)
                </option>
              </select>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                For almost everything, choose <strong>Per menu item</strong> and link the
                matching dish below. Use the lumpia option only for frozen lumpia stock.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newItem.isAvailable}
                onChange={(e) =>
                  setNewItem((s) => ({ ...s, isAvailable: e.target.checked }))
                }
              />
              Mark as available for ordering
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newItem.showBanner}
                onChange={(e) =>
                  setNewItem((s) => ({ ...s, showBanner: e.target.checked }))
                }
              />
              Show announcement on website
            </label>
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
              disabled={creating}
              className="btn btn-primary btn-sm disabled:pointer-events-none disabled:opacity-60"
              onClick={() => void createItem()}
            >
              {creating ? "Creating…" : "Create inventory record"}
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
                <div
                  id={`admin-inventory-qty-${row.id}`}
                  className="rounded-lg border-2 border-[color:var(--gold)] bg-[var(--bg)] p-3 shadow-sm"
                >
                  <label
                    htmlFor={`qty-stock-${row.id}`}
                    className="block text-sm font-bold uppercase tracking-wide text-[color:var(--primary)]"
                  >
                    Quantity in stock
                  </label>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Count in{" "}
                    <strong className="text-[var(--text)]">{r.unitLabel}</strong> — change
                    this number, then Save.
                  </p>
                  <input
                    id={`qty-stock-${row.id}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    autoComplete="off"
                    className="mt-2 w-full rounded border-2 border-[color:var(--border)] bg-[var(--card)] px-3 py-3 text-lg font-semibold tabular-nums text-[color:var(--primary)]"
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
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    How checkout reduces stock
                  </label>
                  <select
                    className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm"
                    value={
                      r.deductionMode ?? INVENTORY_DEDUCTION_ORDER_LINE_QTY
                    }
                    onChange={(e) =>
                      setDrafts((p) => ({
                        ...p,
                        [row.id]: {
                          ...p[row.id],
                          deductionMode: e.target.value,
                        },
                      }))
                    }
                  >
                    <option value={INVENTORY_DEDUCTION_ORDER_LINE_QTY}>
                      Per menu item — subtract cart line quantity (most items)
                    </option>
                    <option value={INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN}>
                      Frozen lumpia — dozens from size keys
                    </option>
                  </select>
                </div>
                {(r.deductionMode ?? INVENTORY_DEDUCTION_ORDER_LINE_QTY) ===
                  INVENTORY_DEDUCTION_ORDER_LINE_QTY && !(r.menuItemId ?? "").trim() ? (
                  <p className="rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    <strong>Link the menu item</strong> above — otherwise checkout
                    won&apos;t deduct sales from this stock row.
                  </p>
                ) : null}
                {(r.deductionMode ?? INVENTORY_DEDUCTION_ORDER_LINE_QTY) ===
                INVENTORY_DEDUCTION_LUMPIA_FROZEN_DOZEN ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Stock is tracked in <strong>dozens</strong>. Only{" "}
                    <strong>frozen</strong> lumpia lines with 1dz / 2dz / party sizes
                    reduce this row. Same-day pickup slots you open here still merge into
                    your normal availability calendar.
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">
                    Each ordered unit subtracts the cart <strong>quantity</strong> for the
                    linked menu SKU (e.g. 3 ramekins → −3). Inventory-linked pickup windows
                    use the same schedule grid as the rest of the site.
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => void save(row)}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="mt-2 w-full rounded border border-red-800/35 bg-transparent px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-50"
                  onClick={() => void deleteItem(row)}
                >
                  Remove inventory row…
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
