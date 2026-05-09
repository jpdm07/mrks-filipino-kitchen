"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MenuItemDTO } from "@/lib/menu-types";
import { buildManualOrderMenuOptions } from "@/lib/build-manual-order-menu-options";
import type { AdminOrderClientRow } from "@/lib/admin-order-client";
import { openAdminReceiptPrintWindow } from "@/lib/admin-receipt-html";
import { computeOrderMonetaryTotals } from "@/lib/order-totals";
import { formatUtensilsCartOneLiner, salesTaxPercentLabel } from "@/lib/config";
import { refreshAdminAfterOrderChange } from "@/lib/admin-orders-changed-event";

const SEL_CUSTOM = "__custom__";
const SEL_BLANK = "";

type LineDraft = {
  id: string;
  selectionKey: string;
  name: string;
  quantity: string;
  unitPrice: string;
  size: string;
  menuItemId?: string;
  sizeKey?: string;
  cookedOrFrozen?: string;
  adoboProtein?: "chicken" | "pork";
  category?: string;
};

function newLine(): LineDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    selectionKey: SEL_BLANK,
    name: "",
    quantity: "1",
    unitPrice: "",
    size: "",
  };
}

export function AdminManualOrderForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [slotOptions, setSlotOptions] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [wantsUtensils, setWantsUtensils] = useState(false);
  const [utensilSets, setUtensilSets] = useState("1");
  const [notes, setNotes] = useState("");
  const [useCustomPickup, setUseCustomPickup] = useState(false);
  const [customPickupText, setCustomPickupText] = useState("");
  const [markPaid, setMarkPaid] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [notifyOwnerSms, setNotifyOwnerSms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuErr, setMenuErr] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<AdminOrderClientRow | null>(
    null
  );

  const menuOptions = useMemo(
    () => buildManualOrderMenuOptions(menuItems),
    [menuItems]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMenuErr(null);
      setMenuLoading(true);
      try {
        const r = await fetch("/api/menu", { cache: "no-store" });
        const j = (await r.json()) as { items?: MenuItemDTO[] };
        if (!r.ok || !Array.isArray(j.items)) {
          if (!cancelled) setMenuErr("Could not load menu prices.");
          return;
        }
        if (!cancelled) setMenuItems(j.items);
      } catch {
        if (!cancelled) setMenuErr("Could not load menu prices.");
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cartMode = useMemo(() => {
    const named = lines.map((l) => l.name.trim()).filter(Boolean);
    if (named.length === 0) return "mixed";
    return named.every((n) => /flan|leche flan/i.test(n)) ? "flan" : "mixed";
  }, [lines]);

  const loadSlots = useCallback(async (date: string, mode: "mixed" | "flan") => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setSlotOptions([]);
      setPickupTime("");
      return;
    }
    setSlotsLoading(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/availability/${encodeURIComponent(date)}?cartMode=${mode}`,
        { cache: "no-store" }
      );
      const j = (await r.json()) as { isOpen?: boolean; slots?: string[] };
      if (!r.ok) {
        setSlotOptions([]);
        setPickupTime("");
        return;
      }
      if (!j.isOpen || !Array.isArray(j.slots) || j.slots.length === 0) {
        setSlotOptions([]);
        setPickupTime("");
        return;
      }
      setSlotOptions(j.slots);
      setPickupTime((t) => (t && j.slots!.includes(t) ? t : ""));
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots(pickupDate, cartMode);
  }, [pickupDate, cartMode, loadSlots]);

  function applyMenuSelection(lineId: string, value: string) {
    setLines((prev) =>
      prev.map((x) => {
        if (x.id !== lineId) return x;
        if (value === SEL_CUSTOM) {
          return {
            ...x,
            selectionKey: SEL_CUSTOM,
            menuItemId: undefined,
            sizeKey: undefined,
            cookedOrFrozen: undefined,
            adoboProtein: undefined,
            category: undefined,
          };
        }
        const opt = menuOptions.find((o) => o.value === value);
        if (!opt) {
          return { ...x, selectionKey: SEL_BLANK };
        }
        const L = opt.line;
        return {
          ...x,
          selectionKey: value,
          name: L.name,
          unitPrice: String(L.unitPrice),
          size: L.size ?? "",
          menuItemId: L.menuItemId,
          sizeKey: L.sizeKey,
          cookedOrFrozen: L.cookedOrFrozen,
          adoboProtein: L.adoboProtein,
          category: L.category,
        };
      })
    );
  }

  const itemsPayload = useMemo(() => {
    return lines
      .filter((l) => l.selectionKey !== SEL_BLANK)
      .map((l) => {
        const qty = Math.floor(Number(l.quantity) || 0);
        const unitPrice = Number(l.unitPrice);
        return {
          name: l.name.trim(),
          quantity: qty,
          unitPrice,
          ...(l.size.trim() ? { size: l.size.trim() } : {}),
          ...(l.menuItemId ? { menuItemId: l.menuItemId } : {}),
          ...(l.sizeKey ? { sizeKey: l.sizeKey } : {}),
          ...(l.cookedOrFrozen ? { cookedOrFrozen: l.cookedOrFrozen } : {}),
          ...(l.adoboProtein ? { adoboProtein: l.adoboProtein } : {}),
          ...(l.category ? { category: l.category } : {}),
        };
      })
      .filter(
        (l) =>
          l.name &&
          l.quantity >= 1 &&
          Number.isFinite(l.unitPrice) &&
          l.unitPrice >= 0
      );
  }, [lines]);

  const previewTotals = useMemo(() => {
    if (itemsPayload.length === 0) return null;
    const setsArg = wantsUtensils
      ? Math.max(1, Math.floor(Number(utensilSets) || 1))
      : 0;
    return computeOrderMonetaryTotals(itemsPayload, wantsUtensils, setsArg);
  }, [itemsPayload, wantsUtensils, utensilSets]);

  async function submit() {
    setErr(null);
    setOk(null);
    setReceiptOrder(null);
    if (itemsPayload.length === 0) {
      setErr(
        "Add at least one valid line: quantity ≥ 1 and a price (pick from menu or enter custom)."
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          items: itemsPayload,
          useCustomPickup,
          customPickupTime: customPickupText.trim(),
          pickupDate: useCustomPickup ? "" : pickupDate,
          pickupTime: useCustomPickup ? "" : pickupTime,
          wantsUtensils,
          utensilSets: wantsUtensils ? Math.max(1, Math.floor(Number(utensilSets) || 1)) : 0,
          notes: notes.trim() || undefined,
          markPaid,
          isDemo,
          notifyOwnerSms,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        orderNumber?: string;
        orderId?: string;
      };
      if (!res.ok) {
        setErr(j.error ?? "Save failed");
        return;
      }
      setOk(`Saved as order #${j.orderNumber}.`);

      if (j.orderId) {
        const gr = await fetch(
          `/api/admin/orders/${encodeURIComponent(j.orderId)}`,
          { credentials: "include", cache: "no-store" }
        );
        const gj = (await gr.json().catch(() => ({}))) as {
          order?: AdminOrderClientRow;
        };
        if (gr.ok && gj.order) setReceiptOrder(gj.order);
      }

      refreshAdminAfterOrderChange(router);
    } finally {
      setBusy(false);
    }
  }

  function handlePrintReceipt() {
    if (!receiptOrder) return;
    openAdminReceiptPrintWindow(receiptOrder);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <p className="text-sm leading-relaxed text-[var(--text-muted)]">
        Use this for walk-ins, phone orders, or other sales <strong>not</strong> from
        the website. Pick from the menu to pre-fill fields, or choose{" "}
        <strong>Custom item</strong>; you can always edit name, size, unit price, and
        quantity on any line. Customer and pickup can be left blank (placeholders / TBD on
        the order). Pickup date is not limited to customer-facing calendar rules; weekly
        kitchen capacity still applies when a date is set.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-[var(--text)]">
            Customer name <span className="font-normal text-[var(--text-muted)]">(optional)</span>
          </span>
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-[var(--text)]">
            Phone <span className="font-normal text-[var(--text-muted)]">(optional)</span>
          </span>
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-semibold text-[var(--text)]">
            Email <span className="font-normal text-[var(--text-muted)]">(optional)</span>
          </span>
          <input
            type="email"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-bold text-[var(--text)]">Line items</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Menu picks fill defaults; every field stays editable before you save.
        </p>
        {menuErr ? (
          <p className="mt-2 text-sm text-amber-700" role="alert">
            {menuErr} You can still use custom lines with manual prices.
          </p>
        ) : null}
        <ul className="mt-3 space-y-3">
          {lines.map((line) => (
            <li
              key={line.id}
              className="rounded border border-[var(--border)] bg-[var(--bg-section)] p-3"
            >
              <label className="block">
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  Menu item
                </span>
                <select
                  className="mt-0.5 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm text-[var(--text)]"
                  value={line.selectionKey}
                  disabled={menuLoading}
                  onChange={(e) => applyMenuSelection(line.id, e.target.value)}
                >
                  <option value={SEL_BLANK}>
                    {menuLoading ? "Loading menu…" : "Choose menu item…"}
                  </option>
                  {menuOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  <option value={SEL_CUSTOM}>Custom item (type name &amp; price)…</option>
                </select>
              </label>

              {line.selectionKey !== SEL_BLANK ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-12">
                  <label className="sm:col-span-5">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Item name
                    </span>
                    <input
                      className="mt-0.5 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm"
                      value={line.name}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.id === line.id ? { ...x, name: e.target.value } : x
                          )
                        )
                      }
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Qty
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="mt-0.5 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm"
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.id === line.id ? { ...x, quantity: e.target.value } : x
                          )
                        )
                      }
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      $ each
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      className="mt-0.5 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm"
                      value={line.unitPrice}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.id === line.id ? { ...x, unitPrice: e.target.value } : x
                          )
                        )
                      }
                    />
                  </label>
                  <label className="sm:col-span-3">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Size (optional)
                    </span>
                    <input
                      className="mt-0.5 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm"
                      value={line.size}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.id === line.id ? { ...x, size: e.target.value } : x
                          )
                        )
                      }
                    />
                  </label>
                </div>
              ) : null}

              {lines.length > 1 ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                  onClick={() =>
                    setLines((prev) => prev.filter((x) => x.id !== line.id))
                  }
                >
                  Remove line
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
          onClick={() => setLines((prev) => [...prev, newLine()])}
        >
          + Add line
        </button>
      </div>

      <div className="rounded border border-[var(--border)] bg-[var(--bg-section)] p-4">
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={useCustomPickup}
            onChange={(e) => setUseCustomPickup(e.target.checked)}
          />
          <span>
            <strong>Enter custom date &amp; time</strong>
            <span className="mt-0.5 block text-[var(--text-muted)]">
              Type any pickup window verbatim — it prints on the customer receipt exactly as
              entered. Calendar slots below are ignored while this is on.
            </span>
          </span>
        </label>
        {useCustomPickup ? (
          <label className="mt-3 block text-sm">
            <span className="font-semibold text-[var(--text)]">Custom pickup</span>
            <textarea
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)]"
              rows={2}
              placeholder='e.g. "Friday, May 9 · 11:45 AM" or any wording you need'
              value={customPickupText}
              onChange={(e) => setCustomPickupText(e.target.value)}
            />
          </label>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold text-[var(--text)]">
                Pickup date{" "}
                <span className="font-normal text-[var(--text-muted)]">(optional)</span>
              </span>
              <input
                type="date"
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-[var(--text)]">
                Pickup time{" "}
                <span className="font-normal text-[var(--text-muted)]">(optional)</span>
              </span>
              <select
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                disabled={slotsLoading || (!pickupDate && slotOptions.length === 0)}
              >
                {slotOptions.length === 0 ? (
                  <option value="">
                    {pickupDate
                      ? slotsLoading
                        ? "Loading slots…"
                        : "No slots — leave unset or pick another date"
                      : "Choose a date first, or leave unset"}
                  </option>
                ) : (
                  <>
                    <option value="">Not set yet</option>
                    {slotOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="rounded border border-[var(--border)] bg-[var(--bg-section)] p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={wantsUtensils}
            onChange={(e) => setWantsUtensils(e.target.checked)}
          />
          <span className="font-medium text-[var(--text)]">Include utensils</span>
        </label>
        {wantsUtensils ? (
          <label className="mt-2 block text-sm">
            <span className="text-[var(--text-muted)]">Sets (total)</span>
            <input
              type="number"
              min={1}
              max={50}
              className="mt-1 w-24 rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1"
              value={utensilSets}
              onChange={(e) => setUtensilSets(e.target.value)}
            />
          </label>
        ) : null}
      </div>

      {previewTotals ? (
        <div className="rounded border border-[var(--border)] bg-[var(--bg-section)] p-4 text-sm">
          <p className="mb-2 font-semibold text-[var(--text)]">
            Totals <span className="font-normal text-[var(--text-muted)]">(with tax)</span>
          </p>
          <div className="space-y-1 font-variant-numeric tabular-nums">
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">Items</span>
              <span>${previewTotals.itemsSub.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-[var(--text-muted)]">Utensils</span>
              <span className="text-right">
                {formatUtensilsCartOneLiner(
                  wantsUtensils,
                  previewTotals.sets,
                  previewTotals.ut
                )}
              </span>
            </div>
            <div className="mt-2 flex justify-between gap-4 border-t border-[var(--border)] pt-2">
              <span className="text-[var(--text-muted)]">Subtotal (before tax)</span>
              <span>${previewTotals.sub.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">
                Sales tax ({salesTaxPercentLabel()})
              </span>
              <span>${previewTotals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-2 font-semibold text-[var(--text)]">
              <span>Total</span>
              <span>${previewTotals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="font-semibold text-[var(--text)]">Notes (optional)</span>
        <textarea
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <fieldset className="space-y-3 rounded border border-[var(--border)] bg-[var(--bg-section)] p-4 text-sm">
        <legend className="px-1 font-semibold text-[var(--text)]">Payment status</legend>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            name="manual-pay-status"
            className="mt-1"
            checked={markPaid}
            onChange={() => setMarkPaid(true)}
          />
          <span>
            <strong>Paid / confirmed</strong>
            <span className="block text-[var(--text-muted)]">
              Pickup calendar event when Google is configured; treated like verified payment.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            name="manual-pay-status"
            className="mt-1"
            checked={!markPaid}
            onChange={() => setMarkPaid(false)}
          />
          <span>
            <strong>Awaiting payment / pending confirmation</strong>
            <span className="block text-[var(--text-muted)]">
              Order is saved but stays pending until you confirm payment later.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDemo}
            onChange={(e) => setIsDemo(e.target.checked)}
          />
          <span>Demo / test order (excluded from revenue metrics)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyOwnerSms}
            onChange={(e) => setNotifyOwnerSms(e.target.checked)}
          />
          <span>Send owner SMS summary (Twilio)</span>
        </label>
      </fieldset>

      {err ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-emerald-700" role="status">
            {ok}{" "}
            <Link href="/admin/dashboard" className="underline">
              Dashboard
            </Link>
          </p>
          {receiptOrder ? (
            <button
              type="button"
              className="btn btn-outline-dark btn-sm"
              onClick={handlePrintReceipt}
            >
              Print receipt
            </button>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Receipt printing was unavailable for this save; open the order from the dashboard
              to print.
            </p>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-gold"
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy ? "Saving…" : "Save off-site order"}
      </button>
    </div>
  );
}
