import type { OrderItemLine } from "@/lib/order-types";

export type OrderRowForAnalytics = {
  items: string;
  createdAt: Date;
  orderNumber: string;
  total: number;
};

function parseItems(json: string): OrderItemLine[] {
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? (v as OrderItemLine[]) : [];
  } catch {
    return [];
  }
}

/** Stable key for grouping (name + variant dimensions). */
export function itemLineKey(line: OrderItemLine): string {
  const sz = line.size?.trim() ? `|${line.size.trim()}` : "";
  const cf =
    line.cookedOrFrozen === "cooked" || line.cookedOrFrozen === "frozen"
      ? `|${line.cookedOrFrozen}`
      : "";
  return `${line.name.trim()}${sz}${cf}`;
}

export function itemLineLabel(line: OrderItemLine): string {
  const sz = line.size ? ` (${line.size})` : "";
  const cf =
    line.cookedOrFrozen === "cooked" || line.cookedOrFrozen === "frozen"
      ? ` [${line.cookedOrFrozen}]`
      : "";
  return `${line.name.trim()}${sz}${cf}`;
}

export type TopItemRow = {
  key: string;
  label: string;
  quantity: number;
  revenue: number;
  ordersWithItem: number;
};

export type MonthBucketRow = {
  month: string;
  items: Array<{ key: string; label: string; quantity: number }>;
};

export type SeasonalityRow = {
  key: string;
  label: string;
  /** 1 = Jan … 12 = Dec — qty sold in that month-of-year (all years in range pooled). */
  byMonthOfYear: Record<number, number>;
};

export type PairRow = {
  itemA: string;
  itemB: string;
  pairCount: number;
  supportPct: number;
  confidenceAGivenB: number;
  confidenceBGivenA: number;
};

export type SalesAnalyticsResult = {
  summary: {
    orderCount: number;
    totalRevenue: number;
    avgOrderValue: number;
    /** UTC date strings YYYY-MM-DD with at least one order */
    activeDays: number;
  };
  topItems: TopItemRow[];
  /** Last N calendar months in range, top items per month */
  monthlyTopItems: MonthBucketRow[];
  /** Seasonality: pooled by Jan–Dec */
  seasonalityTop: SeasonalityRow[];
  topPairs: PairRow[];
  /** Sun=0 … Sat=6, order counts */
  ordersByWeekday: number[];
  /** Hour 0–23 UTC when order was placed */
  ordersByHourUtc: number[];
  insights: string[];
};

const MONTH_NAMES = [
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

function ymdMonth(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export function computeSalesAnalytics(
  orders: OrderRowForAnalytics[],
  options?: { topN?: number; monthlyTopK?: number }
): SalesAnalyticsResult {
  const topN = options?.topN ?? 25;
  const monthlyTopK = options?.monthlyTopK ?? 8;

  const orderCount = orders.length;
  const totalRevenue = Math.round(orders.reduce((s, o) => s + o.total, 0) * 100) / 100;
  const avgOrderValue =
    orderCount > 0 ? Math.round((totalRevenue / orderCount) * 100) / 100 : 0;

  const daySet = new Set<string>();
  const ordersByWeekday = Array.from({ length: 7 }, () => 0);
  const ordersByHourUtc = Array.from({ length: 24 }, () => 0);

  type Agg = {
    label: string;
    qty: number;
    revenue: number;
    orders: Set<string>;
  };
  const byKey = new Map<string, Agg>();

  const monthBuckets = new Map<string, Map<string, { label: string; qty: number }>>();
  const seasonality = new Map<string, { label: string; byMonth: Record<number, number> }>();

  const orderItemSets: Array<{ orderNumber: string; keys: Set<string> }> = [];
  const itemOrderCount = new Map<string, number>();

  for (const o of orders) {
    daySet.add(o.createdAt.toISOString().slice(0, 10));
    ordersByWeekday[o.createdAt.getUTCDay()]++;
    ordersByHourUtc[o.createdAt.getUTCHours()]++;

    const lines = parseItems(o.items).filter((l) => !l.isSample);
    const keysThisOrder = new Set<string>();

    for (const line of lines) {
      const key = itemLineKey(line);
      const label = itemLineLabel(line);
      keysThisOrder.add(key);

      let agg = byKey.get(key);
      if (!agg) {
        agg = { label, qty: 0, revenue: 0, orders: new Set() };
        byKey.set(key, agg);
      }
      const q = Math.max(0, Math.floor(Number(line.quantity) || 0));
      const rev = q * (Number(line.unitPrice) || 0);
      agg.qty += q;
      agg.revenue += rev;
      agg.orders.add(o.orderNumber);

      const ym = ymdMonth(o.createdAt);
      if (!monthBuckets.has(ym)) monthBuckets.set(ym, new Map());
      const mb = monthBuckets.get(ym)!;
      const cur = mb.get(key) ?? { label, qty: 0 };
      cur.qty += q;
      mb.set(key, cur);

      const moy = o.createdAt.getUTCMonth() + 1;
      let se = seasonality.get(key);
      if (!se) {
        se = { label, byMonth: {} };
        seasonality.set(key, se);
      }
      se.byMonth[moy] = (se.byMonth[moy] ?? 0) + q;
    }

    for (const k of keysThisOrder) {
      itemOrderCount.set(k, (itemOrderCount.get(k) ?? 0) + 1);
    }
    orderItemSets.push({ orderNumber: o.orderNumber, keys: keysThisOrder });
  }

  const topItems: TopItemRow[] = [...byKey.entries()]
    .map(([key, a]) => ({
      key,
      label: a.label,
      quantity: a.qty,
      revenue: Math.round(a.revenue * 100) / 100,
      ordersWithItem: a.orders.size,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, topN);

  const topKeysSet = new Set(topItems.slice(0, monthlyTopK * 2).map((t) => t.key));

  const sortedMonths = [...monthBuckets.keys()].sort();
  const monthlyTopItems: MonthBucketRow[] = sortedMonths.map((month) => {
    const m = monthBuckets.get(month)!;
    const items = [...m.entries()]
      .filter(([k]) => topKeysSet.has(k))
      .map(([key, v]) => ({ key, label: v.label, quantity: v.qty }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, monthlyTopK);
    return { month, items };
  });

  const seasonalityTop: SeasonalityRow[] = topItems.slice(0, monthlyTopK).map((t) => {
    const se = seasonality.get(t.key);
    const byMonthOfYear: Record<number, number> = {};
    if (se) {
      for (let m = 1; m <= 12; m++) {
        if (se.byMonth[m]) byMonthOfYear[m] = se.byMonth[m];
      }
    }
    return { key: t.key, label: t.label, byMonthOfYear };
  });

  const pairCount = new Map<string, number>();
  for (const { keys } of orderItemSets) {
    const arr = [...keys].sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const pk = `${arr[i]}\t${arr[j]}`;
        pairCount.set(pk, (pairCount.get(pk) ?? 0) + 1);
      }
    }
  }

  const keyToLabel = new Map<string, string>();
  for (const [k, v] of byKey.entries()) keyToLabel.set(k, v.label);

  const topPairs: PairRow[] = [...pairCount.entries()]
    .map(([pk, c]) => {
      const [ka, kb] = pk.split("\t");
      const itemA = keyToLabel.get(ka) ?? ka;
      const itemB = keyToLabel.get(kb) ?? kb;
      const countA = itemOrderCount.get(ka) ?? 0;
      const countB = itemOrderCount.get(kb) ?? 0;
      const supportPct =
        orderCount > 0 ? Math.round((c / orderCount) * 10000) / 100 : 0;
      const confidenceAGivenB =
        countB > 0 ? Math.round((c / countB) * 10000) / 100 : 0;
      const confidenceBGivenA =
        countA > 0 ? Math.round((c / countA) * 10000) / 100 : 0;
      return {
        itemA,
        itemB,
        pairCount: c,
        supportPct,
        confidenceAGivenB,
        confidenceBGivenA,
      };
    })
    .sort((a, b) => b.pairCount - a.pairCount)
    .slice(0, 25);

  const insights: string[] = [];
  if (orderCount === 0) {
    insights.push("No confirmed orders in this date range yet.");
  } else {
    if (topItems[0]) {
      insights.push(
        `Best-selling line item: ${topItems[0].label} (${topItems[0].quantity} units, $${topItems[0].revenue.toFixed(2)} revenue).`
      );
    }
    if (topPairs[0] && topPairs[0].pairCount >= 2) {
      insights.push(
        `Often bought together: “${topPairs[0].itemA}” + “${topPairs[0].itemB}” (${topPairs[0].pairCount} orders, ${topPairs[0].supportPct}% of orders).`
      );
    }
    let peakM = 1;
    let peakQ = 0;
    if (seasonalityTop[0]) {
      const bm = seasonalityTop[0].byMonthOfYear;
      for (let m = 1; m <= 12; m++) {
        const q = bm[m] ?? 0;
        if (q > peakQ) {
          peakQ = q;
          peakM = m;
        }
      }
      if (peakQ > 0 && topItems[0]) {
        insights.push(
          `For ${topItems[0].label}, the strongest calendar month (across years in range) is ${MONTH_NAMES[peakM - 1]}; plan prep and promos around that window.`
        );
      }
    }
    const peakWd = ordersByWeekday.indexOf(Math.max(...ordersByWeekday));
    const wdNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    insights.push(
      `Most orders are placed on ${wdNames[peakWd]} (UTC) — compare to your pickup schedule when planning prep.`
    );
    const peakHr = ordersByHourUtc.indexOf(Math.max(...ordersByHourUtc));
    insights.push(
      `Peak order hour (UTC): ${peakHr}:00–${peakHr + 1}:00 — convert to your local time for when customers typically check out.`
    );
  }

  return {
    summary: {
      orderCount,
      totalRevenue,
      avgOrderValue,
      activeDays: daySet.size,
    },
    topItems,
    monthlyTopItems,
    seasonalityTop,
    topPairs,
    ordersByWeekday,
    ordersByHourUtc,
    insights,
  };
}

export { MONTH_NAMES };
