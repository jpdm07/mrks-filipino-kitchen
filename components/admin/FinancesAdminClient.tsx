"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminDataSync } from "@/lib/use-admin-data-sync";

const CATEGORIES = [
  "Groceries — Kroger",
  "Groceries — HEB",
  "Groceries — HMart",
  "Packaging — Amazon",
  "Packaging — Other",
  "Supplies — Other",
  "Utilities",
  "Other",
] as const;

type Summary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalOrders: number;
  avgRevenuePerOrder: number;
  expensesByCategory: Record<string, number>;
  startDate: string;
  endDate: string;
};

type ExpenseRow = {
  id: string;
  date: string;
  store: string;
  category: string;
  description: string;
  amount: number;
  notes: string | null;
  isEdited: boolean;
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getUTCDay();
  x.setUTCDate(x.getUTCDate() - day);
  return x;
}

export function FinancesAdminClient() {
  const [preset, setPreset] = useState<
    "week" | "month" | "last" | "lastYear" | "ytd" | "custom"
  >("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [range, setRange] = useState(() => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return { start: ymd(start), end: ymd(end) };
  });

  useEffect(() => {
    const now = new Date();
    if (preset === "week") {
      const s = startOfWeek(now);
      setRange({ start: ymd(s), end: ymd(now) });
    } else if (preset === "month") {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
      setRange({ start: ymd(start), end: ymd(end) });
    } else if (preset === "last") {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
      setRange({ start: ymd(start), end: ymd(end) });
    } else if (preset === "lastYear") {
      const y = now.getUTCFullYear() - 1;
      setRange({
        start: `${y}-01-01`,
        end: `${y}-12-31`,
      });
    } else if (preset === "ytd") {
      const y = now.getUTCFullYear();
      setRange({
        start: `${y}-01-01`,
        end: ymd(now),
      });
    } else if (preset === "custom" && customStart && customEnd) {
      setRange({ start: customStart, end: customEnd });
    }
  }, [preset, customStart, customEnd]);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [income, setIncome] = useState<
    Array<{
      orderNumber: string;
      date: string;
      customerName: string;
      itemsSummary: string;
      total: number;
      pickupDate: string | null;
      status: string;
    }>
  >([]);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<"manual" | "receipt">("manual");

  const [form, setForm] = useState<{
    date: string;
    store: string;
    category: string;
    description: string;
    amount: string;
    notes: string;
  }>({
    date: ymd(new Date()),
    store: "",
    category: CATEGORIES[0],
    description: "",
    amount: "",
    notes: "",
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [parseBusy, setParseBusy] = useState(false);

  const load = useCallback(async () => {
    const q = `startDate=${encodeURIComponent(range.start)}&endDate=${encodeURIComponent(range.end)}`;
    const [sRes, eRes, iRes] = await Promise.all([
      fetch(`/api/admin/finances/summary?${q}`, { credentials: "include" }),
      fetch(`/api/admin/expenses?${q}`, { credentials: "include" }),
      fetch(`/api/admin/finances/income?${q}`, { credentials: "include" }),
    ]);
    if (sRes.ok) setSummary((await sRes.json()) as Summary);
    if (eRes.ok) {
      const d = (await eRes.json()) as { expenses: ExpenseRow[] };
      setExpenses(d.expenses ?? []);
    }
    if (iRes.ok) {
      const d = (await iRes.json()) as { orders: typeof income };
      setIncome(d.orders ?? []);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    void load();
  }, [load]);

  useAdminDataSync(load);

  const saveManual = async () => {
    const amount = parseFloat(form.amount);
    if (!form.store || !form.description || !Number.isFinite(amount) || amount <= 0) {
      setToast("Fill date, store, description, and amount.");
      return;
    }
    const res = await fetch("/api/admin/expenses", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount }),
    });
    if (res.ok) {
      setToast("✅ Expense saved!");
      setForm((f) => ({
        ...f,
        store: "",
        description: "",
        amount: "",
        notes: "",
      }));
      void load();
    } else setToast("Could not save.");
    window.setTimeout(() => setToast(null), 4000);
  };

  const parseReceipt = async () => {
    if (!receiptFile) return;
    if (receiptFile.type === "application/pdf") {
      setToast("PDF receipts: use manual entry for now.");
      return;
    }
    setParseBusy(true);
    const fd = new FormData();
    fd.append("file", receiptFile);
    const res = await fetch("/api/admin/parse-receipt", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    setParseBusy(false);
    const data = (await res.json()) as { parsed?: Record<string, unknown>; error?: string };
    if (!res.ok || !data.parsed) {
      setToast(data.error ?? "Parse failed.");
      return;
    }
    const p = data.parsed;
    const store = typeof p.store === "string" ? p.store : "";
    const date = typeof p.date === "string" ? p.date : ymd(new Date());
    const total = typeof p.total === "number" ? p.total : parseFloat(String(p.total ?? "0"));
    const items = Array.isArray(p.items) ? p.items.length : 0;
    const conf = p.confidence === "low";
    setForm({
      date,
      store,
      category: /kroger/i.test(store)
        ? "Groceries — Kroger"
        : /heb/i.test(store)
          ? "Groceries — HEB"
          : /hmart|h mart/i.test(store)
            ? "Groceries — HMart"
            : "Other",
      description: items ? `Grocery run — ${items} items` : "Receipt import",
      amount: Number.isFinite(total) ? String(total) : "",
      notes: conf ? "Low confidence parse — verify amounts." : "",
    });
    setTab("manual");
    setToast(
      conf
        ? "⚠️ Receipt was hard to read — double-check before saving."
        : "Receipt read — review and save."
    );
    window.setTimeout(() => setToast(null), 5000);
  };

  const catList = useMemo(
    () =>
      Object.entries(summary?.expensesByCategory ?? {}).filter(([, v]) => v > 0),
    [summary]
  );

  const exportExpensesCsv = () => {
    const header = "Date,Store,Category,Description,Amount,Notes,Edited\n";
    const body = expenses
      .map(
        (e) =>
          `"${e.date}","${e.store.replace(/"/g, '""')}","${e.category}","${e.description.replace(/"/g, '""')}",${e.amount},"${(e.notes ?? "").replace(/"/g, '""')}",${e.isEdited ? "yes" : "no"}`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <p className="text-sm text-[var(--text-muted)]">
        Mobile-friendly profit/loss view. Confirmed orders = income; numbers refresh every ~20s
        while you keep this page open (and when you return to the tab). Expenses are logged here.{" "}
        <strong className="text-[var(--text)]">
          Demo / test orders are excluded
        </strong>{" "}
        (mark them on the order page or at checkout when enabled).{" "}
        <Link
          href="/admin/tax-documentation#confirmed-revenue-tax"
          className="font-semibold text-[var(--primary)] underline"
        >
          Full tax transaction report &amp; CSV
        </Link>{" "}
        (confirmed orders only, matches this revenue).
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["week", "This week"],
            ["month", "This month"],
            ["last", "Last month"],
            ["lastYear", "Last calendar year"],
            ["ytd", "This year (YTD)"],
            ["custom", "Custom"],
          ] as const
        ).map(([k, lab]) => (
          <button
            key={k}
            type="button"
            onClick={() => setPreset(k)}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${
              preset === k
                ? "bg-[#0038A8] text-white"
                : "border border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            {lab}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            className="min-h-[44px] rounded border px-2"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <input
            type="date"
            className="min-h-[44px] rounded border px-2"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      ) : null}

      {summary ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="text-lg font-bold text-[#0038A8]">Summary</h2>
          {summary.netProfit >= 0 ? (
            <p className="mt-2 rounded-lg bg-[#FFC200]/40 px-3 py-2 text-sm font-medium text-[var(--text)]">
              ✅ You&apos;re in the green! Net profit this period: $
              {summary.netProfit.toFixed(2)}.
            </p>
          ) : (
            <p className="mt-2 rounded-lg bg-[#CE1126]/15 px-3 py-2 text-sm font-medium text-[#CE1126]">
              ⚠️ Heads up — expenses are higher than income by $
              {Math.abs(summary.netProfit).toFixed(2)} for this period.
            </p>
          )}
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--text-muted)]">💰 Total revenue</dt>
              <dd className="text-lg font-bold">${summary.totalRevenue.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">🛒 Total expenses</dt>
              <dd className="text-lg font-bold">${summary.totalExpenses.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">📊 Net profit / loss</dt>
              <dd
                className={`text-lg font-bold ${
                  summary.netProfit >= 0 ? "text-[#1E7C1E]" : "text-[#CE1126]"
                }`}
              >
                ${summary.netProfit.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">📦 Orders (confirmed)</dt>
              <dd className="text-lg font-bold">{summary.totalOrders}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">💵 Avg / order</dt>
              <dd className="text-lg font-bold">
                ${summary.avgRevenuePerOrder.toFixed(2)}
              </dd>
            </div>
          </dl>
          {catList.length ? (
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <p className="font-semibold text-[#0038A8]">Expense breakdown</p>
              <ul className="mt-2 space-y-1 text-sm">
                {catList.map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-2">
                    <span>{k}</span>
                    <span className="font-mono">${v.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {toast ? (
        <p className="rounded-lg bg-[#FFC200]/35 px-3 py-2 text-sm font-medium">{toast}</p>
      ) : null}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-bold text-[#0038A8]">Add expense</h2>
        <div className="mt-3 flex gap-2 border-b border-[var(--border)] pb-2">
          <button
            type="button"
            className={`min-h-[44px] rounded px-3 text-sm font-semibold ${
              tab === "manual" ? "bg-[#FFC200]/50" : ""
            }`}
            onClick={() => setTab("manual")}
          >
            Manual
          </button>
          <button
            type="button"
            className={`min-h-[44px] rounded px-3 text-sm font-semibold ${
              tab === "receipt" ? "bg-[#FFC200]/50" : ""
            }`}
            onClick={() => setTab("receipt")}
          >
            Receipt photo
          </button>
        </div>
        {tab === "receipt" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              📷 Photo of receipt (JPG/PNG). Image is not stored — only the parsed numbers are saved
              when you confirm on the manual tab.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="min-h-[44px] w-full"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={parseBusy || !receiptFile}
              className="btn btn-primary min-h-[44px] disabled:opacity-40"
              onClick={() => void parseReceipt()}
            >
              {parseBusy ? "Reading…" : "Read receipt"}
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Date
              <input
                type="date"
                className="mt-1 min-h-[44px] w-full rounded border px-2"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold">
              Store
              <input
                className="mt-1 min-h-[44px] w-full rounded border px-2"
                value={form.store}
                onChange={(e) => setForm((f) => ({ ...f, store: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Category
              <select
                className="mt-1 min-h-[44px] w-full rounded border px-2"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Amount ($)
              <input
                type="number"
                step="0.01"
                className="mt-1 min-h-[44px] w-full rounded border px-2"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Description
              <input
                className="mt-1 min-h-[44px] w-full rounded border px-2"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Notes
              <textarea
                className="mt-1 w-full rounded border px-2 py-2"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <button
              type="button"
              className="btn btn-accent min-h-[44px] sm:col-span-2"
              onClick={() => void saveManual()}
            >
              Save expense
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#0038A8]">Expense log</h2>
          <button
            type="button"
            className="rounded border px-3 py-2 text-sm font-semibold"
            onClick={exportExpensesCsv}
          >
            Export CSV
          </button>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Total (visible): $
          {expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}
        </p>
        <ul className="mt-4 space-y-3">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="rounded border border-[var(--border)] p-3 text-sm"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold">
                  {e.date} · {e.store}
                  {e.isEdited ? (
                    <span className="ml-2 text-xs text-[var(--text-muted)]">✏️ edited</span>
                  ) : null}
                </span>
                <span className="font-mono font-bold">${e.amount.toFixed(2)}</span>
              </div>
              <p className="text-[var(--text-muted)]">
                {e.category} — {e.description}
              </p>
              {e.notes ? <p className="mt-1 text-xs">{e.notes}</p> : null}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="text-xs text-[var(--primary)] underline"
                  onClick={async () => {
                    const ns = prompt("New amount", String(e.amount));
                    if (ns == null) return;
                    const amt = parseFloat(ns);
                    if (!Number.isFinite(amt)) return;
                    await fetch(`/api/admin/expenses/${e.id}`, {
                      method: "PATCH",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ amount: amt }),
                    });
                    void load();
                  }}
                >
                  Edit amount
                </button>
                <button
                  type="button"
                  className="text-xs text-[var(--accent)] underline"
                  onClick={async () => {
                    if (
                      !confirm(
                        "Delete this expense? This cannot be undone."
                      )
                    )
                      return;
                    await fetch(`/api/admin/expenses/${e.id}`, {
                      method: "DELETE",
                      credentials: "include",
                    });
                    void load();
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-bold text-[#0038A8]">Income log</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Confirmed orders only (read-only). Total: $
          {income.reduce((s, o) => s + o.total, 0).toFixed(2)}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2 pr-2">Order #</th>
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Customer</th>
                <th className="py-2 pr-2">Items</th>
                <th className="py-2 pr-2">Total</th>
                <th className="py-2">Pickup</th>
              </tr>
            </thead>
            <tbody>
              {income.map((o) => (
                <tr key={o.orderNumber} className="border-b border-[var(--border)]">
                  <td className="py-2 pr-2 font-mono text-xs">{o.orderNumber}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {new Date(o.date).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-2">{o.customerName}</td>
                  <td className="max-w-[200px] truncate py-2 pr-2" title={o.itemsSummary}>
                    {o.itemsSummary}
                  </td>
                  <td className="py-2 pr-2 font-semibold">${o.total.toFixed(2)}</td>
                  <td className="py-2 text-xs text-[var(--text-muted)]">
                    {o.pickupDate ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
