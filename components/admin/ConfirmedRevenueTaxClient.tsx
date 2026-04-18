"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminDataSync } from "@/lib/use-admin-data-sync";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Previous calendar year Jan 1 – Dec 31 (auto-updates each January). */
function defaultLastCalendarYearRange() {
  const y = new Date().getFullYear() - 1;
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

type TxRow = {
  orderNumber: string;
  dateOrderPlacedUtc: string;
  pickupDate: string | null;
  pickupTime: string | null;
  descriptionLineItems: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subtotal: number;
  salesTax: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  orderStatus: string;
  orderSource: string;
  customerNotes: string | null;
  customInquiry: string | null;
  adminNotes: string | null;
  utensilSets: number;
  utensilCharge: number;
  hasRefundLog: boolean;
};

type Totals = {
  count: number;
  totalSubtotal: number;
  totalSalesTaxCollected: number;
  totalRevenue: number;
};

export function ConfirmedRevenueTaxClient() {
  const initialRange = defaultLastCalendarYearRange();
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [preset, setPreset] = useState<"lastYear" | "ytd" | "custom">("lastYear");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    if (preset === "lastYear") {
      const r = defaultLastCalendarYearRange();
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (preset === "ytd") {
      const y = now.getFullYear();
      setStartDate(`${y}-01-01`);
      setEndDate(ymd(now));
    }
  }, [preset]);

  const range = useMemo(
    () => ({ start: startDate, end: endDate }),
    [startDate, endDate]
  );

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!range.start || !range.end) return;
    setErr(null);
    if (!silent) setLoading(true);
    try {
      const q = new URLSearchParams({
        startDate: range.start,
        endDate: range.end,
      });
      const res = await fetch(`/api/admin/finances/confirmed-revenue?${q}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? "Could not load revenue.");
        setTotals(null);
        setRows([]);
        return;
      }
      const data = (await res.json()) as {
        totals: Totals;
        transactions: TxRow[];
      };
      setTotals(data.totals);
      setRows(data.transactions ?? []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    void load();
  }, [load]);

  useAdminDataSync(() => void load({ silent: true }));

  const downloadCsv = () => {
    const q = new URLSearchParams({
      startDate: range.start,
      endDate: range.end,
      format: "csv",
    });
    window.open(
      `/api/admin/finances/confirmed-revenue?${q}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <section
      id="confirmed-revenue-tax"
      className="mb-10 rounded-xl border-2 border-[#0038A8] bg-[var(--card)] p-5 shadow-sm"
    >
      <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#0038A8]">
        Confirmed revenue (tax &amp; records)
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
        Every <strong>confirmed</strong>, non-demo order in the range — same basis as{" "}
        <Link href="/admin/finances" className="font-semibold text-[var(--primary)] underline">
          Finances
        </Link>{" "}
        income. Auto-refreshes from confirmed orders every ~20s while this tab is open (and when
        you return to it). Use the spreadsheet for filtering,
        pivot tables, and your CPA.{" "}
        <strong className="text-[var(--text)]">
          Order date = when the order was placed
        </strong>{" "}
        (not pickup date).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["lastYear", "Last calendar year"],
            ["ytd", "This year (YTD)"],
            ["custom", "Custom dates"],
          ] as const
        ).map(([k, lab]) => (
          <button
            key={k}
            type="button"
            onClick={() => setPreset(k)}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${
              preset === k
                ? "bg-[#0038A8] text-white"
                : "border border-[var(--border)] bg-[var(--gold-light)]"
            }`}
          >
            {lab}
          </button>
        ))}
      </div>

      {preset === "custom" ? (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block text-sm font-semibold">
            Start
            <input
              type="date"
              className="mt-1 block min-h-11 rounded-lg border border-[var(--border)] px-3"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            End
            <input
              type="date"
              className="mt-1 block min-h-11 rounded-lg border border-[var(--border)] px-3"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Range: <strong className="text-[var(--text)]">{range.start}</strong> →{" "}
          <strong className="text-[var(--text)]">{range.end}</strong>
        </p>
      )}

      {err ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Loading…</p>
      ) : totals ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 rounded-lg bg-[#FFFDF5] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0038A8]">
                Orders
              </p>
              <p className="text-2xl font-bold tabular-nums">{totals.count}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0038A8]">
                Subtotal
              </p>
              <p className="text-2xl font-bold tabular-nums">
                ${totals.totalSubtotal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0038A8]">
                Sales tax (collected)
              </p>
              <p className="text-2xl font-bold tabular-nums">
                ${totals.totalSalesTaxCollected.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0038A8]">
                Total revenue
              </p>
              <p className="text-2xl font-bold tabular-nums text-[#1E7C1E]">
                ${totals.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              className="min-h-11 rounded-full bg-[#FFC200] px-5 py-2 text-sm font-bold text-[#1a1a1a] shadow-sm hover:opacity-95"
            >
              Download spreadsheet (CSV)
            </button>
            <span className="self-center text-xs text-[var(--text-muted)]">
              Opens in Excel / Google Sheets — filter &amp; sort any column.
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="min-w-[900px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--gold-light)]">
                  <th className="p-2 font-bold text-[#0038A8]">Order #</th>
                  <th className="p-2 font-bold text-[#0038A8]">Placed (UTC)</th>
                  <th className="p-2 font-bold text-[#0038A8]">Pickup</th>
                  <th className="p-2 font-bold text-[#0038A8]">What / items</th>
                  <th className="p-2 font-bold text-[#0038A8]">Total</th>
                  <th className="p-2 font-bold text-[#0038A8]">Payment</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-[var(--text-muted)]">
                      No confirmed orders in this range.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.orderNumber}
                      className="border-b border-[var(--border)] odd:bg-[var(--bg-section)]"
                    >
                      <td className="p-2 font-mono font-semibold">{r.orderNumber}</td>
                      <td className="p-2 whitespace-nowrap tabular-nums text-xs">
                        {r.dateOrderPlacedUtc.slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="p-2 text-xs">
                        {r.pickupDate ?? "—"}
                        {r.pickupTime ? ` @ ${r.pickupTime}` : ""}
                      </td>
                      <td className="p-2 text-xs leading-snug">
                        {r.descriptionLineItems || "—"}
                        {r.customerNotes ? (
                          <span className="block text-[var(--text-muted)]">
                            Notes: {r.customerNotes.slice(0, 120)}
                            {r.customerNotes.length > 120 ? "…" : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2 font-semibold tabular-nums">${r.total.toFixed(2)}</td>
                      <td className="p-2 text-xs">
                        {r.paymentMethod ?? "—"}
                        {r.paymentStatus ? ` · ${r.paymentStatus}` : ""}
                        {r.hasRefundLog ? (
                          <span className="block text-amber-800">Refund log on file</span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="mt-6 border-t border-[var(--border)] pt-4 text-xs text-[var(--text-muted)]">
        Full tax packet (orders + expenses + mileage + this file): use{" "}
        <strong>Report period &amp; download</strong> below, or{" "}
        <Link href="/admin/finances" className="font-semibold text-[var(--primary)] underline">
          Finances
        </Link>
        . ZIP includes <code className="rounded bg-[var(--bg-section)] px-1">06_confirmed_revenue_tax.csv</code>.
      </p>
    </section>
  );
}
