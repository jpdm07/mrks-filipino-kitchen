"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FLAN_WEEKLY_CAP_RAMEKINS } from "@/lib/menu-cook-capacity";
import {
  YEMA_COGS_PER_PIECE_USD,
  YEMA_PLANNER_WEEKLY_PIECES_CAP,
  YEMA_RETAIL_SINGLE_USD,
} from "@/lib/yema-cost-model";
import { ORDER_FULFILLMENT } from "@/lib/config";
import { useAdminDataSync } from "@/lib/use-admin-data-sync";

type PlannerActualsPayload = {
  timezone: string;
  todayYmd: string;
  today: { count: number; revenue: number; tips: number };
  week: {
    labelStart: string;
    labelEnd: string;
    count: number;
    revenue: number;
    tips: number;
  };
};

const MENU_ITEMS = [
  { id: "lumpia-beef-cooked", name: "Lumpia Beef cooked/doz", price: 14.99, cost: 7.47, cookMin: 15 },
  { id: "lumpia-pork-cooked", name: "Lumpia Pork cooked/doz", price: 12.99, cost: 6.87, cookMin: 15 },
  { id: "lumpia-turkey-cooked", name: "Lumpia Turkey cooked/doz", price: 12.99, cost: 7.07, cookMin: 15 },
  { id: "lumpia-beef-frozen", name: "Lumpia Beef frozen/doz", price: 14.99, cost: 6.07, cookMin: 5 },
  { id: "lumpia-pork-frozen", name: "Lumpia Pork frozen/doz", price: 12.99, cost: 5.57, cookMin: 5 },
  { id: "lumpia-turkey-frozen", name: "Lumpia Turkey frozen/doz", price: 12.99, cost: 5.77, cookMin: 5 },
  { id: "pancit-chicken-sm", name: "Pancit Chicken Small", price: 10.99, cost: 11.04, cookMin: 30 },
  { id: "pancit-chicken-24", name: "Pancit Chicken 2-4 srv", price: 25.0, cost: 16.0, cookMin: 45 },
  { id: "pancit-chicken-party", name: "Pancit Chicken Party", price: 65.0, cost: 41.47, cookMin: 75 },
  { id: "pancit-shrimp-sm", name: "Pancit Shrimp Small", price: 12.99, cost: 12.19, cookMin: 30 },
  { id: "pancit-shrimp-24", name: "Pancit Shrimp 2-4 srv", price: 28.0, cost: 18.0, cookMin: 45 },
  { id: "pancit-shrimp-party", name: "Pancit Shrimp Party", price: 80.0, cost: 49.67, cookMin: 75 },
  { id: "tocino-pork-plate", name: "Tocino Pork Plate", price: 11.99, cost: 6.95, cookMin: 20 },
  { id: "tocino-chicken-plate", name: "Tocino Chicken Plate", price: 11.99, cost: 6.65, cookMin: 20 },
  { id: "tocino-pork-frozen", name: "Frozen Tocino Pork", price: 9.99, cost: 9.1, cookMin: 5 },
  { id: "tocino-chicken-frozen", name: "Frozen Tocino Chicken", price: 9.99, cost: 8.6, cookMin: 5 },
  {
    id: "adobo-chicken-plate",
    name: "Adobo (chicken) — plate",
    price: 11.99,
    cost: 3.1,
    cookMin: 30,
  },
  {
    id: "adobo-pork-plate",
    name: "Adobo (pork) — plate",
    price: 11.99,
    cost: 3.82,
    cookMin: 30,
  },
  {
    id: "adobo-chicken-party",
    name: "Adobo (chicken) — party tray (8–10)",
    price: 55.0,
    cost: 19.2,
    cookMin: 75,
  },
  {
    id: "adobo-pork-party",
    name: "Adobo (pork) — party tray (8–10)",
    price: 55.0,
    cost: 26.7,
    cookMin: 75,
  },
  { id: "quail", name: "Quail Eggs (10 pcs)", price: 7.99, cost: 3.82, cookMin: 20 },
  { id: "flan", name: "Caramel Flan (ramekin)", price: 3.5, cost: 2.71, cookMin: 0 },
  {
    id: "yema",
    name: "Yema (per piece)",
    price: YEMA_RETAIL_SINGLE_USD,
    cost: YEMA_COGS_PER_PIECE_USD,
    cookMin: 0,
  },
] as const;

type ItemId = (typeof MENU_ITEMS)[number]["id"];

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function cents(n: number) {
  return Math.round(n * 100);
}

const BALANCED_PRESET: Partial<Record<ItemId, number>> = {
  "adobo-chicken-plate": 4,
  "lumpia-beef-cooked": 2,
  "lumpia-pork-cooked": 2,
  "pancit-chicken-24": 1,
  "tocino-pork-plate": 1,
  "flan": 12,
  "yema": 18,
};

const LIGHT_PRESET: Partial<Record<ItemId, number>> = {
  "adobo-chicken-plate": 2,
  "lumpia-beef-cooked": 1,
  "pancit-chicken-sm": 1,
  "tocino-chicken-plate": 1,
  "flan": 6,
  "yema": 12,
};

function presetCookMinutes(p: Partial<Record<ItemId, number>>) {
  let m = 0;
  for (const it of MENU_ITEMS) {
    if (it.cookMin === 0) continue;
    m += (p[it.id] ?? 0) * it.cookMin;
  }
  return m;
}

function scalePreset(
  base: Partial<Record<ItemId, number>>,
  targetMaxMinutes: number,
  weeklyCap: number,
): Record<ItemId, number> {
  const out = Object.fromEntries(MENU_ITEMS.map((i) => [i.id, 0])) as Record<ItemId, number>;
  const baseMin = presetCookMinutes(base);
  const maxCook = Math.min(targetMaxMinutes, weeklyCap);
  const scale =
    baseMin <= 0 ? 0 : Math.min(1, maxCook / baseMin) * 0.999; // stay safely under cap
  for (const it of MENU_ITEMS) {
    const q = base[it.id];
    if (q == null || q === 0) continue;
    if (it.id === "flan") {
      out.flan = Math.min(FLAN_WEEKLY_CAP_RAMEKINS, Math.max(0, Math.floor(q * scale)));
      continue;
    }
    if (it.id === "yema") {
      out.yema = Math.min(
        YEMA_PLANNER_WEEKLY_PIECES_CAP,
        Math.max(0, Math.floor(q * scale))
      );
      continue;
    }
    out[it.id] = Math.max(0, Math.floor(q * scale));
  }
  return normalizeWithinCookCap(out, weeklyCap);
}

function normalizeWithinCookCap(qty: Record<ItemId, number>, weeklyCap: number): Record<ItemId, number> {
  const q = { ...qty };
  let guard = 0;
  while (guard++ < 5000) {
    let cook = 0;
    for (const it of MENU_ITEMS) {
      if (it.cookMin === 0) continue;
      cook += (q[it.id] ?? 0) * it.cookMin;
    }
    if (cook <= weeklyCap) break;
    let best: { id: ItemId; score: number } | null = null;
    for (const it of MENU_ITEMS) {
      if (it.cookMin === 0) continue;
      const n = q[it.id] ?? 0;
      if (n <= 0) continue;
      const profit = it.price - it.cost;
      const score = profit / it.cookMin;
      if (!best || score < best.score) best = { id: it.id, score };
    }
    if (best && (q[best.id] ?? 0) > 0) q[best.id] = (q[best.id] ?? 0) - 1;
    else break;
  }
  if ((q.flan ?? 0) > FLAN_WEEKLY_CAP_RAMEKINS) q.flan = FLAN_WEEKLY_CAP_RAMEKINS;
  if ((q.yema ?? 0) > YEMA_PLANNER_WEEKLY_PIECES_CAP) q.yema = YEMA_PLANNER_WEEKLY_PIECES_CAP;
  return q;
}

function maxProfitQuantities(weeklyCap: number): Record<ItemId, number> {
  const profitC = (id: ItemId) => {
    const it = MENU_ITEMS.find((m) => m.id === id)!;
    return cents(it.price - it.cost);
  };

  const cookItems = MENU_ITEMS.filter((i) => i.cookMin > 0);
  const n = weeklyCap;
  const NEG = -1e15;
  const dp: number[] = new Array(n + 1).fill(NEG);
  const fromW: number[] = new Array(n + 1).fill(-1);
  const lastItem: (ItemId | null)[] = new Array(n + 1).fill(null);
  dp[0] = 0;

  for (let w = 0; w <= n; w++) {
    if (dp[w] === NEG) continue;
    for (const it of cookItems) {
      const nw = w + it.cookMin;
      if (nw > n) continue;
      const cand = dp[w] + profitC(it.id);
      if (cand > dp[nw]) {
        dp[nw] = cand;
        fromW[nw] = w;
        lastItem[nw] = it.id;
      }
    }
  }

  let bestW = 0;
  for (let w = 0; w <= n; w++) {
    if (dp[w] > dp[bestW]) bestW = w;
  }

  const q = Object.fromEntries(MENU_ITEMS.map((i) => [i.id, 0])) as Record<ItemId, number>;
  let w = bestW;
  while (w > 0 && lastItem[w]) {
    const id = lastItem[w]!;
    q[id] = (q[id] ?? 0) + 1;
    w = fromW[w];
    if (w < 0) break;
  }

  const flanProfit = profitC("flan");
  q.flan = flanProfit > 0 ? FLAN_WEEKLY_CAP_RAMEKINS : 0;
  const yemaProfit = profitC("yema");
  q.yema = yemaProfit > 0 ? YEMA_PLANNER_WEEKLY_PIECES_CAP : 0;
  return q;
}

const ACCENT_HEADER = "var(--primary)";
const GOLD = "#FFC200";

export function EarningsPlannerClient() {
  const [actuals, setActuals] = useState<PlannerActualsPayload | null>(null);
  const [actualsErr, setActualsErr] = useState<string | null>(null);

  const loadActuals = useCallback(async () => {
    setActualsErr(null);
    try {
      const res = await fetch("/api/admin/earnings-planner-actuals", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as
        | PlannerActualsPayload
        | { error?: string };
      if (!res.ok) {
        setActualsErr((j as { error?: string }).error ?? "Could not load sales.");
        setActuals(null);
        return;
      }
      setActuals(j as PlannerActualsPayload);
    } catch {
      setActualsErr("Could not load sales.");
      setActuals(null);
    }
  }, []);

  useEffect(() => {
    void loadActuals();
  }, [loadActuals]);

  useAdminDataSync(loadActuals);

  const [thursdayPrepHrs, setThursdayPrepHrs] = useState(4);
  const [fridayCookHrs, setFridayCookHrs] = useState(6);
  const [quantities, setQuantities] = useState<Record<ItemId, number>>(() =>
    Object.fromEntries(MENU_ITEMS.map((i) => [i.id, 0])) as Record<ItemId, number>,
  );

  const effectiveFridayHrs = Math.min(8, Math.max(4, fridayCookHrs));
  const weeklyCookCap = Math.max(0, Math.round(effectiveFridayHrs * 60));

  const totals = useMemo(() => {
    let revenue = 0;
    let foodCost = 0;
    let cookMinutes = 0;
    let flanCount = 0;
    let yemaPieceCount = 0;

    for (const it of MENU_ITEMS) {
      const q = quantities[it.id] ?? 0;
      if (q <= 0) continue;
      revenue += q * it.price;
      foodCost += q * it.cost;
      if (it.id === "flan") flanCount += q;
      else if (it.id === "yema") yemaPieceCount += q;
      else cookMinutes += q * it.cookMin;
    }

    const profit = revenue - foodCost;
    const overCook = cookMinutes > weeklyCookCap;
    const overFlan = flanCount > FLAN_WEEKLY_CAP_RAMEKINS;
    const overYema = yemaPieceCount > YEMA_PLANNER_WEEKLY_PIECES_CAP;

    return {
      revenue,
      foodCost,
      profit,
      cookMinutes,
      flanCount,
      yemaPieceCount,
      overCook,
      overFlan,
      overYema,
    };
  }, [quantities, weeklyCookCap]);

  const setQty = useCallback((id: ItemId, raw: number) => {
    const n = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    setQuantities((prev) => {
      const next = { ...prev, [id]: n };
      if (id === "flan" && n > FLAN_WEEKLY_CAP_RAMEKINS) next.flan = FLAN_WEEKLY_CAP_RAMEKINS;
      if (id === "yema" && n > YEMA_PLANNER_WEEKLY_PIECES_CAP)
        next.yema = YEMA_PLANNER_WEEKLY_PIECES_CAP;
      return next;
    });
  }, []);

  const applyPreset = useCallback(
    (preset: Record<ItemId, number>) => {
      setQuantities(preset);
    },
    [],
  );

  const handleMaxProfit = useCallback(() => {
    applyPreset(maxProfitQuantities(weeklyCookCap));
  }, [applyPreset, weeklyCookCap]);

  const handleBalanced = useCallback(() => {
    applyPreset(scalePreset(BALANCED_PRESET, weeklyCookCap, weeklyCookCap));
  }, [applyPreset, weeklyCookCap]);

  const handleLight = useCallback(() => {
    const target = Math.min(150, weeklyCookCap);
    applyPreset(scalePreset(LIGHT_PRESET, target, weeklyCookCap));
  }, [applyPreset, weeklyCookCap]);

  const handleReset = useCallback(() => {
    applyPreset(Object.fromEntries(MENU_ITEMS.map((i) => [i.id, 0])) as Record<ItemId, number>);
  }, [applyPreset]);

  return (
    <div className="space-y-10 pb-16">
      <header className="space-y-2">
        <h1
          className="font-[family-name:var(--font-playfair)] text-3xl font-bold sm:text-4xl"
          style={{ color: ACCENT_HEADER }}
        >
          Weekly Earnings Planner
        </h1>
        <p className="text-lg text-[var(--text-muted)]">
          Plan your week. Know your numbers. Grow smart.
        </p>
      </header>

      <section className="rounded-xl border-2 border-emerald-800/30 bg-emerald-50/50 p-4 sm:p-5 dark:bg-emerald-950/25">
        <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
          Actual sales (live from your orders)
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
          Based on <strong className="text-[var(--text)]">confirmed</strong>, non-demo orders — same
          revenue basis as{" "}
          <Link href="/admin/finances" className="font-semibold text-emerald-800 underline dark:text-emerald-300">
            Finances
          </Link>
          . Dates use{" "}
          <strong className="text-[var(--text)]">{ORDER_FULFILLMENT.PICKUP_TIMEZONE}</strong>{" "}
          (order placed time). If you had a sale but see $0 here, the order may still be{" "}
          <strong className="text-[var(--text)]">Pending Payment Verification</strong> — verify payment
          on the{" "}
          <Link href="/admin/dashboard" className="font-semibold text-emerald-800 underline dark:text-emerald-300">
            dashboard
          </Link>{" "}
          first.
        </p>
        {actualsErr ? (
          <p className="mt-3 text-sm font-medium text-red-700">{actualsErr}</p>
        ) : actuals ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-800/20 bg-white/80 p-4 dark:bg-black/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                Today ({actuals.todayYmd})
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                {money(actuals.today.revenue)}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {actuals.today.count} order{actuals.today.count === 1 ? "" : "s"}
                {actuals.today.tips > 0
                  ? ` · tips recorded ${money(actuals.today.tips)}`
                  : ""}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-800/20 bg-white/80 p-4 dark:bg-black/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                This week (Mon–Sun)
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {actuals.week.labelStart} → {actuals.week.labelEnd}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                {money(actuals.week.revenue)}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {actuals.week.count} order{actuals.week.count === 1 ? "" : "s"}
                {actuals.week.tips > 0
                  ? ` · tips recorded ${money(actuals.week.tips)}`
                  : ""}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">Loading actuals…</p>
        )}
      </section>

      <section
        className="rounded-xl border-2 p-4 sm:p-5"
        style={{ borderColor: ACCENT_HEADER, background: "var(--card)" }}
      >
        <h2 className="text-lg font-bold" style={{ color: ACCENT_HEADER }}>
          My cooking time this week
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-base">
            <span className="font-semibold text-[var(--text)]">Thursday prep hours</span>
            <input
              type="number"
              min={0}
              max={12}
              step={0.5}
              value={thursdayPrepHrs}
              onChange={(e) => setThursdayPrepHrs(Math.max(0, Number(e.target.value) || 0))}
              className="mt-2 w-full min-h-12 rounded-lg border-2 border-[var(--border)] bg-white px-3 text-lg font-medium text-[var(--text)]"
            />
          </label>
          <label className="block text-base">
            <span className="font-semibold text-[var(--text)]">Friday cooking hours (4–8)</span>
            <input
              type="number"
              min={4}
              max={8}
              step={0.5}
              value={effectiveFridayHrs}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                setFridayCookHrs(Math.min(8, Math.max(4, v)));
              }}
              className="mt-2 w-full min-h-12 rounded-lg border-2 border-[var(--border)] bg-white px-3 text-lg font-medium text-[var(--text)]"
            />
          </label>
        </div>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Weekly cook cap for this planner = Friday cooking hours × 60 (currently{" "}
          <strong className="text-[var(--text)]">{weeklyCookCap} min</strong>). These only affect the
          planner — your actual calendar availability is set in{" "}
          <Link href="/admin/availability" className="font-semibold underline" style={{ color: ACCENT_HEADER }}>
            Admin &gt; Availability
          </Link>
          .
        </p>
      </section>

      <div
        className="sticky z-[150] rounded-xl border-2 p-4 shadow-lg sm:p-5"
        style={{
          top: "7.5rem",
          borderColor: GOLD,
          background: "linear-gradient(180deg, rgba(255,194,0,0.14) 0%, var(--card) 100%)",
        }}
      >
        <p className="text-base font-bold" style={{ color: ACCENT_HEADER }}>
          Planner projection (sliders — not your live POS)
        </p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          These numbers come only from the quantity sliders below. They do{" "}
          <strong className="text-[var(--text)]">not</strong> pull today&apos;s real orders — see{" "}
          <strong className="text-[var(--text)]">Actual sales</strong> above for that.
        </p>
        <ul className="mt-3 space-y-2 text-lg">
          <li className="flex flex-wrap justify-between gap-2">
            <span>💰 Estimated Revenue</span>
            <span className="font-semibold tabular-nums">{money(totals.revenue)}</span>
          </li>
          <li className="flex flex-wrap justify-between gap-2">
            <span>🛒 Estimated Food Cost</span>
            <span className="font-semibold tabular-nums">{money(totals.foodCost)}</span>
          </li>
          <li className="flex flex-wrap justify-between gap-2">
            <span>📊 Estimated Profit</span>
            <span
              className={`font-bold tabular-nums ${
                totals.profit >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {money(totals.profit)}
            </span>
          </li>
          <li className="flex flex-wrap justify-between gap-2">
            <span>⏱️ Cook time used</span>
            <span className="font-semibold tabular-nums">
              {totals.cookMinutes} / {weeklyCookCap} min
            </span>
          </li>
          <li className="pt-1">
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-[var(--border)]"
              role="progressbar"
              aria-valuenow={Math.min(totals.cookMinutes, weeklyCookCap)}
              aria-valuemin={0}
              aria-valuemax={weeklyCookCap || 1}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  totals.overCook ? "bg-red-500" : "bg-[color:var(--primary)]"
                }`}
                style={{
                  width: `${weeklyCookCap > 0 ? Math.min(100, (totals.cookMinutes / weeklyCookCap) * 100) : 0}%`,
                }}
              />
            </div>
          </li>
          <li className="flex flex-wrap justify-between gap-2">
            <span>🍮 Flan</span>
            <span className="font-semibold tabular-nums">
              {totals.flanCount} / {FLAN_WEEKLY_CAP_RAMEKINS} ramekins
            </span>
          </li>
          <li className="flex flex-wrap justify-between gap-2">
            <span>🍬 Yema (pieces)</span>
            <span className="font-semibold tabular-nums">
              {totals.yemaPieceCount} / {YEMA_PLANNER_WEEKLY_PIECES_CAP}
            </span>
          </li>
        </ul>
        {totals.overCook ? (
          <p className="mt-3 text-base font-semibold text-red-600" role="alert">
            ⚠️ This is over your weekly cooking limit. Remove some items to stay within {weeklyCookCap}{" "}
            minutes.
          </p>
        ) : null}
        {totals.overFlan ? (
          <p className="mt-2 text-base font-semibold text-red-600" role="alert">
            ⚠️ Flan is limited to {FLAN_WEEKLY_CAP_RAMEKINS} ramekins per week in this planner.
          </p>
        ) : null}
        {totals.overYema ? (
          <p className="mt-2 text-base font-semibold text-red-600" role="alert">
            ⚠️ Yema is capped at {YEMA_PLANNER_WEEKLY_PIECES_CAP} pieces per week in this planner (
            {money(YEMA_RETAIL_SINGLE_USD)}/pc menu).
          </p>
        ) : null}
      </div>

      <section>
        <h2 className="text-xl font-bold" style={{ color: ACCENT_HEADER }}>
          Menu quantities
        </h2>
        <p className="mt-1 text-base text-[var(--text-muted)]">
          Adjust quantities to see revenue, food cost, and profit per line and in the summary above.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[640px] border-collapse text-left text-base">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--gold-light)]">
                <th className="p-3 font-bold" style={{ color: ACCENT_HEADER }}>
                  Item
                </th>
                <th className="p-3 font-bold" style={{ color: ACCENT_HEADER }}>
                  Qty
                </th>
                <th className="p-3 font-bold" style={{ color: ACCENT_HEADER }}>
                  Cook min
                </th>
                <th className="p-3 font-bold" style={{ color: ACCENT_HEADER }}>
                  Est. revenue
                </th>
                <th className="p-3 font-bold" style={{ color: ACCENT_HEADER }}>
                  Est. profit
                </th>
              </tr>
            </thead>
            <tbody>
              {MENU_ITEMS.map((it) => {
                const q = quantities[it.id] ?? 0;
                const lineRev = q * it.price;
                const lineProfit = q * (it.price - it.cost);
                return (
                  <tr key={it.id} className="border-b border-[var(--border)] odd:bg-[var(--bg-section)]">
                    <td className="p-3 font-medium">{it.name}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={q}
                        onChange={(e) => setQty(it.id, Number(e.target.value))}
                        className="min-h-12 w-20 rounded-lg border-2 border-[var(--border)] bg-white px-2 text-center text-lg font-semibold"
                        aria-label={`Quantity for ${it.name}`}
                      />
                    </td>
                    <td className="p-3 tabular-nums text-[var(--text-muted)]">{it.cookMin}</td>
                    <td className="p-3 tabular-nums font-medium">{money(lineRev)}</td>
                    <td
                      className={`p-3 tabular-nums font-semibold ${
                        lineProfit >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {money(lineProfit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold" style={{ color: ACCENT_HEADER }}>
          Best combinations this week
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Uses your current weekly cook cap ({weeklyCookCap} min). Max Profit solves for highest profit
          at or below that cap (flan fills to {FLAN_WEEKLY_CAP_RAMEKINS} when profitable).
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleMaxProfit}
            className="min-h-12 rounded-full border-2 px-5 py-2 text-base font-bold text-white shadow-sm hover:opacity-95"
            style={{ borderColor: ACCENT_HEADER, background: ACCENT_HEADER }}
          >
            Max Profit
          </button>
          <button
            type="button"
            onClick={handleBalanced}
            className="min-h-12 rounded-full border-2 px-5 py-2 text-base font-bold shadow-sm hover:opacity-95"
            style={{ borderColor: GOLD, background: GOLD, color: "#1a1a1a" }}
          >
            Balanced Week
          </button>
          <button
            type="button"
            onClick={handleLight}
            className="min-h-12 rounded-full border-2 border-[var(--border)] bg-[var(--card)] px-5 py-2 text-base font-bold hover:bg-[var(--gold-light)]"
          >
            Light Week
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="min-h-12 rounded-full border-2 border-red-300 bg-white px-5 py-2 text-base font-bold text-red-700 hover:bg-red-50"
          >
            Reset All
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold" style={{ color: ACCENT_HEADER }}>
          How to earn more without cooking more
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TipCard
            title="Focus on your most profitable items"
            header="Sell higher-margin items first"
            body={
              <>
                <p>
                  Your most profitable items per cook minute are:{" "}
                  <strong>Chicken or Pork Adobo (chicken) — plate: ~$0.30 profit per cook minute</strong>{" "}
                  at full recipe cost; <strong>pork adobo — plate: ~$0.27</strong>;{" "}
                  <strong>cooked lumpia (any): $0.50+</strong>;{" "}
                  <strong>tocino plates: $0.25+</strong> (profit per cook minute, rough).
                </p>
                <p className="mt-2">
                  Your least profitable per cook minute: large pancit party trays can take 75 minutes for
                  a thinner margin than several adobo plates in the same window.
                </p>
                <p className="mt-2">
                  <strong>Tip:</strong> When your week is filling up, prioritize adobo plates and lumpia
                  orders over pancit party trays. You earn more for the same time spent.
                </p>
              </>
            }
            action="Use the planner above to see the difference before accepting large pancit party orders."
          />
          <TipCard
            title="Offer one easy add-on per order"
            header="Add an upsell to every order"
            body={
              <>
                <p>
                  Every order is a chance to add a little more revenue with almost no extra work. Suggest
                  one of these at checkout or in your order confirmation message:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Extra dipping sauce cup: $0.50 each (costs you $0.15, profit $0.35)
                  </li>
                  <li>
                    Add a Caramel Flan to your order: $3.50 (already made, zero cook time)
                  </li>
                  <li>Add a frozen lumpia dozen: $12.99–$14.99 (5 min to pack)</li>
                  <li>Add quail eggs: $7.99 (20 min cook time, high perceived value)</li>
                </ul>
              </>
            }
            action='Add a "Customers also add..." section on the cart or checkout page suggesting flan or extra sauce to anyone who hasn&apos;t already added it.'
          />
          <TipCard
            title="Make flan every week without fail"
            header="Flan is your easiest money"
            body={
              <>
                <p>
                  Flan costs you $2.71 to make and sells for $3.50. You make it on Sunday in batches of 12.
                  It sits in the fridge for 4–5 days until pickup Mon–Thurs. It uses{" "}
                  <strong>zero</strong> of your Friday cooking minutes.
                </p>
                <p className="mt-2">
                  24 ramekins × $0.79 profit = $18.96 pure profit from 2 batches on a Sunday afternoon.
                  That&apos;s money that costs you no Friday energy at all.
                </p>
              </>
            }
            action="Commit to making 2 batches every single Sunday regardless of how busy the rest of the week is. Always have flan available. It sells itself."
          />
          <TipCard
            title="Push frozen items — they prep themselves"
            header="Frozen items are low effort, high return"
            body={
              <>
                <p>
                  Frozen lumpia and frozen tocino only take 5 minutes of your cook time because you roll
                  or marinate them during Thursday prep — which you&apos;re already doing. They use almost
                  none of your Friday capacity.
                </p>
                <p className="mt-2">
                  A customer buying 2 dozen frozen lumpia = $25.98 and only costs you 10 cook minutes on
                  Friday. Compare that to 2 dozen cooked lumpia = $25.98 but 30 cook minutes. Same revenue.
                  One third of the Friday cook time.
                </p>
              </>
            }
            action='Promote frozen items on the menu as "Cook at home on your schedule" — market the convenience angle to busy families.'
          />
          <TipCard
            title="Create simple bundles that feel like a deal"
            header="Bundle deals increase order size"
            body={
              <>
                <p>
                  People spend more when they feel like they&apos;re getting a deal, even if the savings are
                  small. You don&apos;t need to discount heavily — package things together and name them.
                </p>
                <p className="mt-2 font-semibold text-[var(--text)]">Example bundles:</p>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>
                    <strong>Family Dinner Bundle:</strong> Pancit Small + Lumpia Pork Dozen + 2 Flan.
                    Individual total: $10.99 + $12.99 + $7.00 = $30.98. Bundle price: $28.00 — saves customer
                    $2.98. Your cook time: 30 + 15 + 0 = 45 min. Your profit still strong at ~$12+.
                  </li>
                  <li>
                    <strong>Party Starter Pack:</strong> Lumpia Beef Dozen + Lumpia Pork Dozen + Quail Eggs.
                    Individual: $14.99 + $12.99 + $7.99 = $35.97. Bundle price: $33.00. Cook time: 15 + 15 +
                    20 = 50 min. Higher order value, still within capacity.
                  </li>
                </ul>
              </>
            }
            action='Add 2–3 bundle options to the menu page as a "Bundles" section. Bundles increase average order value without adding meaningful cook time.'
          />
          <TipCard
            title="Turn first-time buyers into regulars"
            header="Repeat customers are your best customers"
            body={
              <>
                <p>
                  One customer who orders every 2 weeks is worth more than 10 one-time customers. Focus on
                  keeping people coming back.
                </p>
                <p className="mt-2 font-semibold text-[var(--text)]">Easy ways to encourage repeat orders:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Send a follow-up text after pickup: &quot;Hope you enjoyed your order! We&apos;re
                    taking orders for next Friday. Reply anytime to place yours.&quot;
                  </li>
                  <li>
                    Offer a simple loyalty reward: 6th order gets a free flan — costs you $2.71, keeps them
                    loyal.
                  </li>
                  <li>
                    Let recurring customers get first access to pickup slots before you open to everyone.
                  </li>
                </ul>
              </>
            }
            action="In the admin dashboard, flag customers who have ordered 2+ times. Reach out to them personally when you open new pickup dates."
          />
          <TipCard
            title="People buy from people they connect with"
            header="Your story is your marketing"
            body={
              <>
                <p>
                  You have something most food businesses don&apos;t have — a real, emotional story behind
                  why you cook. Named after your son. Built from homesickness. Recipes perfected over years
                  of love.
                </p>
                <p className="mt-2">
                  That story is marketing. Use it everywhere: post setup before an event, behind-the-scenes
                  rolling lumpia, when you make flan on Sunday, remind people the food is 100% made from scratch by
                  one person.
                </p>
                <p className="mt-2">
                  People in Cypress who know your story will choose you over a restaurant because it feels
                  personal. They&apos;re not just buying food — they&apos;re supporting you and your son.
                </p>
              </>
            }
            action={
              "Post on your Facebook page at least once a week even if it's just a photo of what you're cooking that day. Consistency builds a following and a following becomes a customer base."
            }
          />
          <TipCard
            title="Show up where your customers already are"
            header="Events and popups bring new customers"
            body={
              <>
                <p>
                  School events, church gatherings, neighborhood markets, HOA events, office potlucks,
                  Filipino community events in the Houston/Cypress area — one appearance can bring 10–20
                  new customers.
                </p>
                <p className="mt-2">
                  The school event you&apos;re doing right now is exactly this. One good event can fill your
                  order slots for weeks afterward if you have your cards and samples ready.
                </p>
                <p className="mt-2 font-semibold text-[var(--text)]">Other events worth looking into near Cypress TX:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Cy-Fair area school events and fundraisers</li>
                  <li>Local church bazaars and festivals</li>
                  <li>Cypress Creek area farmers markets</li>
                  <li>Filipino community events in Katy/Houston area</li>
                  <li>Office catering for nearby businesses</li>
                </ul>
              </>
            }
            action='After every event, post on Facebook with a photo. "We were at [event] today — thank you to everyone who stopped by!" It shows activity, builds credibility, and reaches people who weren&apos;t there.'
          />
        </div>
      </section>
    </div>
  );
}

function TipCard({
  header,
  title,
  body,
  action,
}: {
  header: string;
  title: string;
  body: ReactNode;
  action: string;
}) {
  return (
    <article
      className="flex flex-col overflow-hidden rounded-xl border-2 shadow-sm"
      style={{ borderColor: ACCENT_HEADER }}
    >
      <div className="px-4 py-3" style={{ background: GOLD }}>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT_HEADER }}>
          {header}
        </p>
        <h3 className="mt-1 text-lg font-bold leading-snug text-[#1a1a1a]">{title}</h3>
      </div>
      <div className="flex flex-1 flex-col gap-3 border-t-2 bg-[var(--card)] p-4 text-base leading-relaxed text-[var(--text)]" style={{ borderColor: ACCENT_HEADER }}>
        {body}
        <p className="mt-auto border-l-4 pl-3 text-[var(--text)]" style={{ borderColor: ACCENT_HEADER }}>
          <span className="font-bold" style={{ color: ACCENT_HEADER }}>
            Action:{" "}
          </span>
          {action}
        </p>
      </div>
    </article>
  );
}
