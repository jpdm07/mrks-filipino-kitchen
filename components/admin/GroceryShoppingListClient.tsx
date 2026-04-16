"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GROCERY_CATALOG,
  type GroceryCatalogLine,
  type GroceryStoreHint,
} from "@/lib/grocery-shopping-catalog";

const STORAGE_KEY = "mrk-grocery-planner-v1";

type CustomLine = {
  id: string;
  label: string;
  store: GroceryStoreHint;
  unit: string;
  budget: number;
};

type Persisted = {
  budgets: Record<string, number>;
  included: Record<string, boolean>;
  customs: CustomLine[];
};

function defaultPersisted(): Persisted {
  const budgets: Record<string, number> = {};
  const included: Record<string, boolean> = {};
  for (const row of GROCERY_CATALOG) {
    budgets[row.id] = row.anticipatedUsd;
    included[row.id] = true;
  }
  return { budgets, included, customs: [] };
}

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return defaultPersisted();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersisted();
    const p = JSON.parse(raw) as Partial<Persisted>;
    const base = defaultPersisted();
    const budgets = { ...base.budgets, ...(p.budgets ?? {}) };
    const included = { ...base.included, ...(p.included ?? {}) };
    for (const row of GROCERY_CATALOG) {
      if (budgets[row.id] == null || Number.isNaN(budgets[row.id])) {
        budgets[row.id] = row.anticipatedUsd;
      }
      if (included[row.id] === undefined) included[row.id] = true;
    }
    const customs = Array.isArray(p.customs) ? p.customs : [];
    return { budgets, included, customs };
  } catch {
    return defaultPersisted();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPrintHtml(
  rows: Array<{
    label: string;
    store: string;
    unit: string;
    budget: number;
  }>,
  tripTotal: number
): string {
  const tr = rows
    .map(
      (r) =>
        `<tr>
  <td style="width:28px;text-align:center;font-size:16px;border:1px solid #333;padding:6px;">☐</td>
  <td style="border:1px solid #333;padding:6px;font-size:12px;">${escapeHtml(r.label)}</td>
  <td style="border:1px solid #333;padding:6px;font-size:11px;">${escapeHtml(r.store)}</td>
  <td style="border:1px solid #333;padding:6px;font-size:11px;">${escapeHtml(r.unit)}</td>
  <td style="border:1px solid #333;padding:6px;text-align:right;font-size:12px;">$${r.budget.toFixed(2)}</td>
  <td style="border:1px solid #333;padding:6px;min-width:72px;">&nbsp;</td>
</tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Grocery trip — Mr. K's</title>
<style>
  @page { margin: 12mm; }
  body { font-family: system-ui, sans-serif; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { font-size: 11px; color: #444; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 2px solid #0038a8; padding: 4px 6px; }
  .tot { margin-top: 12px; font-size: 13px; font-weight: 700; }
</style></head><body>
<h1>Mr. K's — grocery trip</h1>
<p class="sub">Check boxes in the store with a pen. Write actual prices in the last column; compare to Budget.</p>
<table>
<thead><tr>
  <th style="width:28px;">Done</th>
  <th>Item</th>
  <th>Store</th>
  <th>Unit</th>
  <th>Budget</th>
  <th>Actual</th>
</tr></thead>
<tbody>${tr}</tbody>
</table>
<p class="tot">Budget subtotal (this list): $${tripTotal.toFixed(2)}</p>
<p style="font-size:10px;color:#666;margin-top:16px;">Printed from admin · Mr. K's Filipino Kitchen</p>
</body></html>`;
}

function openPrintWindow(html: string): void {
  if (typeof document === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Grocery list print");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;width:0;height:0;border:0;left:0;top:0;opacity:0;pointer-events:none";
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) {
    cleanup();
    window.alert("Could not open print preview.");
    return;
  }
  iframe.onload = () => {
    try {
      win.focus();
      win.print();
    } catch {
      window.alert("Print failed. Try again.");
    }
    win.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 120_000);
  };
  try {
    iframe.srcdoc = html;
  } catch {
    cleanup();
    window.alert("Could not prepare print.");
  }
}

export function GroceryShoppingListClient() {
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [customs, setCustoms] = useState<CustomLine[]>([]);
  const [storeFilter, setStoreFilter] = useState<GroceryStoreHint | "All">(
    "All"
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const p = loadPersisted();
    setBudgets(p.budgets);
    setIncluded(p.included);
    setCustoms(p.customs);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const p: Persisted = { budgets, included, customs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }, [budgets, included, customs, mounted]);

  const catalogRows = useMemo(() => {
    let list = GROCERY_CATALOG;
    if (storeFilter !== "All") {
      list = list.filter((r) => r.store === storeFilter);
    }
    return list;
  }, [storeFilter]);

  const tripTotal = useMemo(() => {
    let s = 0;
    for (const row of GROCERY_CATALOG) {
      if (included[row.id]) s += budgets[row.id] ?? row.anticipatedUsd;
    }
    for (const c of customs) {
      if (included[c.id]) s += c.budget;
    }
    return Math.round(s * 100) / 100;
  }, [budgets, included, customs]);

  const printRows = useMemo(() => {
    const out: Array<{
      label: string;
      store: string;
      unit: string;
      budget: number;
    }> = [];
    for (const row of GROCERY_CATALOG) {
      if (!included[row.id]) continue;
      out.push({
        label: row.label,
        store: row.store,
        unit: row.unit,
        budget: budgets[row.id] ?? row.anticipatedUsd,
      });
    }
    for (const c of customs) {
      if (!included[c.id]) continue;
      out.push({
        label: c.label,
        store: c.store,
        unit: c.unit,
        budget: c.budget,
      });
    }
    return out.sort((a, b) => a.store.localeCompare(b.store) || a.label.localeCompare(b.label));
  }, [budgets, included, customs]);

  const setBudget = useCallback((id: string, v: number) => {
    setBudgets((p) => ({ ...p, [id]: Number.isFinite(v) ? v : 0 }));
  }, []);

  const resetDefaults = useCallback(() => {
    if (!window.confirm("Reset all catalog line budgets to defaults?")) return;
    setBudgets((prev) => {
      const next = { ...prev };
      for (const row of GROCERY_CATALOG) {
        next[row.id] = row.anticipatedUsd;
      }
      return next;
    });
  }, []);

  const selectTripNone = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const row of GROCERY_CATALOG) next[row.id] = false;
    for (const c of customs) next[c.id] = false;
    setIncluded(next);
  }, [customs]);

  const includeVisibleOnly = useCallback(() => {
    setIncluded((p) => {
      const n = { ...p };
      for (const row of catalogRows) n[row.id] = true;
      for (const c of customs) {
        if (storeFilter === "All" || c.store === storeFilter) n[c.id] = true;
      }
      return n;
    });
  }, [catalogRows, customs, storeFilter]);

  const addCustom = useCallback(() => {
    const label = window.prompt("Item name?");
    if (!label?.trim()) return;
    const unit = window.prompt("Typical unit (e.g. 1 bag, 2 lb)") ?? "1";
    const budgetRaw = window.prompt("Anticipated $ (budget) for this line?", "5");
    const budget = Number(budgetRaw);
    const id = `custom-${crypto.randomUUID()}`;
    setCustoms((prev) => [
      ...prev,
      {
        id,
        label: label.trim(),
        store: "Any",
        unit: unit.trim() || "1",
        budget: Number.isFinite(budget) ? budget : 0,
      },
    ]);
    setIncluded((p) => ({ ...p, [id]: true }));
  }, []);

  const removeCustom = useCallback((id: string) => {
    setCustoms((prev) => prev.filter((x) => x.id !== id));
    setIncluded((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    setBudgets((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
  }, []);

  const printList = useCallback(() => {
    if (printRows.length === 0) {
      window.alert("Include at least one line before printing.");
      return;
    }
    const total = printRows.reduce((s, r) => s + r.budget, 0);
    openPrintWindow(buildPrintHtml(printRows, total));
  }, [printRows]);

  if (!mounted) {
    return (
      <p className="text-sm text-[var(--text-muted)]">Loading your list…</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--text)]">
        <p>
          <strong>Review before you print:</strong> toggle what you need this
          trip, adjust <strong>Budget $</strong> to what you expect to pay per
          line, then check the <strong>Trip total</strong> (all checked lines,
          not only the store filter). The printed sheet has empty{" "}
          <strong>Actual</strong> boxes to write shelf prices and compare
          overspending. Use a pen to mark the Done column in the store.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold">
          Store filter
          <select
            className="ml-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm"
            value={storeFilter}
            onChange={(e) =>
              setStoreFilter(e.target.value as GroceryStoreHint | "All")
            }
          >
            <option value="All">All stores</option>
            <option value="Kroger">Kroger</option>
            <option value="HEB">HEB</option>
            <option value="HMart">HMart</option>
            <option value="Amazon">Amazon</option>
            <option value="Any">Any</option>
          </select>
        </label>
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] bg-[var(--gold-light)] px-3 py-2 text-sm font-semibold"
          onClick={includeVisibleOnly}
        >
          Check all visible rows
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
          onClick={selectTripNone}
        >
          Clear trip
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
          onClick={resetDefaults}
        >
          Reset catalog budgets
        </button>
        <button
          type="button"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
          onClick={printList}
        >
          Print / PDF
        </button>
        <button
          type="button"
          className="rounded-lg border border-dashed border-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--primary)]"
          onClick={addCustom}
        >
          + One-off line
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--gold-light)]/50">
              <th className="px-3 py-2 font-semibold">This trip</th>
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 font-semibold">Store</th>
              <th className="px-3 py-2 font-semibold">Unit</th>
              <th className="px-3 py-2 font-semibold">Budget $</th>
            </tr>
          </thead>
          <tbody>
            {catalogRows.map((row: GroceryCatalogLine) => (
              <tr
                key={row.id}
                className="border-b border-[var(--border)]/80 hover:bg-[var(--gold-light)]/20"
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={Boolean(included[row.id])}
                    onChange={(e) =>
                      setIncluded((p) => ({ ...p, [row.id]: e.target.checked }))
                    }
                    aria-label={`Include ${row.label}`}
                  />
                </td>
                <td className="px-3 py-2 font-medium">{row.label}</td>
                <td className="px-3 py-2 text-[var(--text-muted)]">
                  {row.store}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  {row.unit}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-24 rounded border border-[var(--border)] px-2 py-1"
                    value={budgets[row.id] ?? row.anticipatedUsd}
                    onChange={(e) =>
                      setBudget(row.id, parseFloat(e.target.value) || 0)
                    }
                  />
                </td>
              </tr>
            ))}
            {storeFilter !== "All" &&
            customs.filter((c) => c.store === storeFilter).length === 0 &&
            customs.length > 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-center text-[var(--text-muted)]"
                >
                  No one-off lines for this store — switch filter to &quot;All
                  stores&quot; or add a line.
                </td>
              </tr>
            ) : null}
            {customs.map((c) => {
              if (storeFilter !== "All" && c.store !== storeFilter)
                return null;
              return (
                <tr
                  key={c.id}
                  className="border-b border-[var(--border)]/80 bg-amber-50/40 hover:bg-amber-50/70"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(included[c.id])}
                      onChange={(e) =>
                        setIncluded((p) => ({ ...p, [c.id]: e.target.checked }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{c.label}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {c.store}
                  </td>
                  <td className="px-3 py-2 text-xs">{c.unit}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-24 rounded border border-[var(--border)] px-2 py-1"
                      value={c.budget}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setCustoms((prev) =>
                          prev.map((x) =>
                            x.id === c.id ? { ...x, budget: v } : x
                          )
                        );
                      }}
                    />
                    <button
                      type="button"
                      className="ml-2 text-xs font-semibold text-[var(--accent)] underline"
                      onClick={() => removeCustom(c.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary)]/5 px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            Trip total (included lines only)
          </p>
          <p className="text-3xl font-bold text-[var(--primary)]">
            ${tripTotal.toFixed(2)}
          </p>
        </div>
        <p className="max-w-md text-xs text-[var(--text-muted)]">
          Budgets save in this browser. Printed list includes ☐ checkboxes and
          a blank <strong>Actual</strong> column for shelf prices.
        </p>
      </div>
    </div>
  );
}
