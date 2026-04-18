"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

type AnalyticsPayload = {
  range: { startDate: string; endDate: string };
  summary: {
    orderCount: number;
    totalRevenue: number;
    avgOrderValue: number;
    activeDays: number;
  };
  topItems: Array<{
    key: string;
    label: string;
    quantity: number;
    revenue: number;
    ordersWithItem: number;
  }>;
  monthlyTopItems: Array<{
    month: string;
    items: Array<{ key: string; label: string; quantity: number }>;
  }>;
  seasonalityTop: Array<{
    key: string;
    label: string;
    byMonthOfYear: Record<number, number>;
  }>;
  topPairs: Array<{
    itemA: string;
    itemB: string;
    pairCount: number;
    supportPct: number;
    confidenceAGivenB: number;
    confidenceBGivenA: number;
  }>;
  ordersByWeekday: number[];
  ordersByHourUtc: number[];
  insights: string[];
};

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MOY = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function AnalyticsSalesClient() {
  const [preset, setPreset] = useState<
    "30d" | "90d" | "12m" | "ytd" | "lastYear" | "custom"
  >("12m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [range, setRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setUTCMonth(start.getUTCMonth() - 12);
    return { start: ymd(start), end: ymd(end) };
  });

  useEffect(() => {
    const now = new Date();
    if (preset === "30d") {
      const s = new Date(now);
      s.setUTCDate(s.getUTCDate() - 30);
      setRange({ start: ymd(s), end: ymd(now) });
    } else if (preset === "90d") {
      const s = new Date(now);
      s.setUTCDate(s.getUTCDate() - 90);
      setRange({ start: ymd(s), end: ymd(now) });
    } else if (preset === "12m") {
      const s = new Date(now);
      s.setUTCMonth(s.getUTCMonth() - 12);
      setRange({ start: ymd(s), end: ymd(now) });
    } else if (preset === "ytd") {
      const y = now.getUTCFullYear();
      setRange({ start: `${y}-01-01`, end: ymd(now) });
    } else if (preset === "lastYear") {
      const y = now.getUTCFullYear() - 1;
      setRange({ start: `${y}-01-01`, end: `${y}-12-31` });
    } else if (preset === "custom" && customStart && customEnd) {
      setRange({ start: customStart, end: customEnd });
    }
  }, [preset, customStart, customEnd]);

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!range.start || !range.end) return;
    setLoading(true);
    setErr(null);
    const q = new URLSearchParams({
      startDate: range.start,
      endDate: range.end,
    });
    const res = await fetch(`/api/admin/analytics/sales?${q}`, {
      credentials: "include",
    });
    setLoading(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Could not load analytics.");
      setData(null);
      return;
    }
    setData((await res.json()) as AnalyticsPayload);
  }, [range.start, range.end]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxQty = useMemo(
    () => Math.max(0, ...(data?.topItems.map((t) => t.quantity) ?? [0])),
    [data]
  );
  const maxWd = useMemo(
    () => Math.max(1, ...(data?.ordersByWeekday ?? [0])),
    [data]
  );
  const maxHr = useMemo(
    () => Math.max(1, ...(data?.ordersByHourUtc ?? [0])),
    [data]
  );

  return (
    <div className="mt-8 space-y-10">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["30d", "Last 30 days"],
            ["90d", "Last 90 days"],
            ["12m", "Last 12 months"],
            ["ytd", "Year to date"],
            ["lastYear", "Last calendar year"],
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
            className="min-h-11 rounded border px-2"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <input
            type="date"
            className="min-h-11 rounded border px-2"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          Range: <strong>{range.start}</strong> → <strong>{range.end}</strong>
        </p>
      )}

      {err ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      ) : null}

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading analytics…</p>
      ) : data ? (
        <>
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-bold text-[#0038A8]">At a glance</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Confirmed orders
                </dt>
                <dd className="text-2xl font-bold tabular-nums">{data.summary.orderCount}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Revenue
                </dt>
                <dd className="text-2xl font-bold tabular-nums text-[#1E7C1E]">
                  ${data.summary.totalRevenue.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Avg order value
                </dt>
                <dd className="text-2xl font-bold tabular-nums">
                  ${data.summary.avgOrderValue.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Active days (orders)
                </dt>
                <dd className="text-2xl font-bold tabular-nums">{data.summary.activeDays}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Tie-out to money: use{" "}
              <Link href="/admin/finances" className="font-semibold underline text-[var(--primary)]">
                Finances
              </Link>{" "}
              or{" "}
              <Link
                href="/admin/tax-documentation"
                className="font-semibold underline text-[var(--primary)]"
              >
                Tax export
              </Link>{" "}
              for totals by period.
            </p>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-bold text-[#0038A8]">Insights</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
              {data.insights.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-bold text-[#0038A8]">Top-selling items (by quantity)</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Grouped by menu line (name + size + cooked/frozen). Sample items excluded.
            </p>
            <div className="mt-4 space-y-3">
              {data.topItems.slice(0, 15).map((row) => (
                <div key={row.key}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="min-w-0 font-medium leading-snug">{row.label}</span>
                    <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                      {row.quantity} units · ${row.revenue.toFixed(2)} · {row.ordersWithItem}{" "}
                      orders
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full bg-[#0038A8]"
                      style={{
                        width: `${maxQty > 0 ? (row.quantity / maxQty) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-bold text-[#0038A8]">When orders are placed (UTC)</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Convert to Central Time for local patterns. Peak checkout time helps plan reminders.
            </p>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Day of week</h3>
                <div className="mt-2 space-y-1">
                  {data.ordersByWeekday.map((n, i) => (
                    <div key={WD[i]} className="flex items-center gap-2 text-sm">
                      <span className="w-8 shrink-0 text-[var(--text-muted)]">{WD[i]}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded bg-[var(--border)]">
                        <div
                          className="h-full rounded bg-[#FFC200]"
                          style={{ width: `${(n / maxWd) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 tabular-nums">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Hour (UTC)</h3>
                <div
                  className="mt-2 grid max-w-xl gap-px"
                  style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
                >
                  {data.ordersByHourUtc.map((n, h) => (
                    <div
                      key={h}
                      title={`${h}:00 UTC — ${n} orders`}
                      className="flex flex-col items-center text-[9px]"
                    >
                      <div
                        className="flex w-full items-end justify-center rounded-sm bg-[var(--border)]"
                        style={{ height: 52 }}
                      >
                        <div
                          className="w-[85%] rounded-sm bg-[#0038A8]"
                          style={{
                            height: `${Math.max(2, (n / maxHr) * 100)}%`,
                            minHeight: n > 0 ? 3 : 0,
                          }}
                        />
                      </div>
                      <span className="text-[var(--text-muted)]">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-bold text-[#0038A8]">Month-by-month (top lines)</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              See which months had the strongest sales for your top products.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[640px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--gold-light)]">
                    <th className="p-2 font-bold text-[#0038A8]">Month</th>
                    <th className="p-2 font-bold text-[#0038A8]">Top lines (qty)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyTopItems.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-3 text-[var(--text-muted)]">
                        No monthly breakdown.
                      </td>
                    </tr>
                  ) : (
                    data.monthlyTopItems.map((m) => (
                      <tr key={m.month} className="border-b border-[var(--border)]">
                        <td className="p-2 font-mono whitespace-nowrap">{m.month}</td>
                        <td className="p-2 text-xs leading-relaxed">
                          {m.items.map((it) => (
                            <span key={it.key} className="mr-2 inline-block">
                              <strong>{it.label}</strong> ({it.quantity})
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-bold text-[#0038A8]">Seasonality (Jan–Dec)</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Totals pooled by <strong>calendar month</strong> across all years in the range — e.g.
              all Januarys together. Helps spot seasonal dips and peaks.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[720px] w-full border-collapse text-center text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--gold-light)]">
                    <th className="p-1 text-left font-bold text-[#0038A8]">Item</th>
                    {MOY.map((m) => (
                      <th key={m} className="p-1 font-bold text-[#0038A8]">
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.seasonalityTop.slice(0, 10).map((row) => {
                    const vals = MOY.map((_, i) => row.byMonthOfYear[i + 1] ?? 0);
                    const max = Math.max(1, ...vals);
                    return (
                      <tr key={row.key} className="border-b border-[var(--border)]">
                        <td className="max-w-[200px] p-1 text-left text-[11px] font-medium leading-snug">
                          {row.label}
                        </td>
                        {MOY.map((_, i) => {
                          const q = row.byMonthOfYear[i + 1] ?? 0;
                          return (
                            <td
                              key={i}
                              className="p-1 align-bottom"
                              title={`${MOY[i]}: ${q} units`}
                            >
                              <div className="mx-auto flex h-10 w-full max-w-[40px] flex-col justify-end rounded bg-[var(--border)]/80">
                                <div
                                  className="w-full rounded-sm bg-[#0038A8]"
                                  style={{
                                    height: `${(q / max) * 100}%`,
                                    minHeight: q > 0 ? 3 : 0,
                                  }}
                                />
                              </div>
                              <span className="tabular-nums text-[10px] text-[var(--text-muted)]">
                                {q || "—"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-bold text-[#0038A8]">Often bought together</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Pairs that appear on the same order. <strong>Support</strong> = share of all orders;
              <strong> P(A|B)</strong> = orders with both ÷ orders with B.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[720px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--gold-light)]">
                    <th className="p-2 font-bold text-[#0038A8]">Item A</th>
                    <th className="p-2 font-bold text-[#0038A8]">Item B</th>
                    <th className="p-2 font-bold text-[#0038A8]">Orders</th>
                    <th className="p-2 font-bold text-[#0038A8]">Support %</th>
                    <th className="p-2 font-bold text-[#0038A8]">P(B|A)</th>
                    <th className="p-2 font-bold text-[#0038A8]">P(A|B)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPairs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-3 text-[var(--text-muted)]">
                        Need orders with 2+ distinct lines to show pairs.
                      </td>
                    </tr>
                  ) : (
                    data.topPairs.map((p, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td className="p-2 align-top text-xs">{p.itemA}</td>
                        <td className="p-2 align-top text-xs">{p.itemB}</td>
                        <td className="p-2 tabular-nums">{p.pairCount}</td>
                        <td className="p-2 tabular-nums">{p.supportPct}%</td>
                        <td className="p-2 tabular-nums">{p.confidenceBGivenA}%</td>
                        <td className="p-2 tabular-nums">{p.confidenceAGivenB}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
