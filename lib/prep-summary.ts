import { ORDER_STATUSES_COUNTING_TOWARD_CAPACITY } from "@/lib/menu-capacity-catalog";
import type { OrderItemLine } from "@/lib/order-types";
import {
  addCalendarDaysYMD,
  getThisWeeksFridaySaturdayAfterThursday,
  isWellFormedPickupYMD,
} from "@/lib/pickup-lead-time";
import { itemLineKey, itemLineLabel } from "@/lib/sales-analytics";

export type PrepLine = {
  key: string;
  label: string;
  quantity: number;
  source: "computed";
};

export type PrepLineMerged = {
  key: string;
  label: string;
  quantity: number;
  source: "computed" | "extra";
  note?: string;
};

export type PrepSummaryOverrideState = {
  hiddenKeys: string[];
  qtyOverrides: Record<string, number>;
  lineNotes: Record<string, string>;
  extraLines: Array<{
    id: string;
    section: "main" | "dessert";
    label: string;
    qty: number;
  }>;
};

export const EMPTY_PREP_OVERRIDE_STATE: PrepSummaryOverrideState = {
  hiddenKeys: [],
  qtyOverrides: {},
  lineNotes: {},
  extraLines: [],
};

export function parsePrepOverrideState(json: string | null | undefined): PrepSummaryOverrideState {
  if (!json?.trim()) return { ...EMPTY_PREP_OVERRIDE_STATE };
  try {
    const v = JSON.parse(json) as Partial<PrepSummaryOverrideState>;
    return {
      hiddenKeys: Array.isArray(v.hiddenKeys) ? v.hiddenKeys.map(String) : [],
      qtyOverrides:
        v.qtyOverrides && typeof v.qtyOverrides === "object" && v.qtyOverrides !== null
          ? Object.fromEntries(
              Object.entries(v.qtyOverrides).filter(
                ([, n]) => typeof n === "number" && Number.isFinite(n)
              )
            )
          : {},
      lineNotes:
        v.lineNotes && typeof v.lineNotes === "object" && v.lineNotes !== null
          ? Object.fromEntries(
              Object.entries(v.lineNotes).filter(([, s]) => typeof s === "string")
            )
          : {},
      extraLines: Array.isArray(v.extraLines)
        ? v.extraLines
            .filter(
              (x): x is PrepSummaryOverrideState["extraLines"][number] =>
                x != null &&
                typeof x === "object" &&
                typeof (x as { id?: string }).id === "string" &&
                ((x as { section?: string }).section === "main" ||
                  (x as { section?: string }).section === "dessert") &&
                typeof (x as { label?: string }).label === "string" &&
                typeof (x as { qty?: number }).qty === "number" &&
                Number.isFinite((x as { qty: number }).qty)
            )
            .map((x) => ({
              id: String((x as { id: string }).id),
              section: (x as { section: "main" | "dessert" }).section,
              label: String((x as { label: string }).label).slice(0, 500),
              qty: Math.max(0, Math.floor((x as { qty: number }).qty)),
            }))
        : [],
    };
  } catch {
    return { ...EMPTY_PREP_OVERRIDE_STATE };
  }
}

/** Sun..Sat calendar week that contains Thursday `thursdayYmd`. */
export function weekSunToSatFromThursday(thursdayYmd: string): {
  sun: string;
  sat: string;
} {
  return {
    sun: addCalendarDaysYMD(thursdayYmd, -4),
    sat: addCalendarDaysYMD(thursdayYmd, 2),
  };
}

/**
 * Normalize DB pickup strings to YYYY-MM-DD (handles stray whitespace or
 * lightly malformed legacy values). Returns null if not parseable.
 */
export function normalizePickupYmd(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const mm = String(mo).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  const ymd = `${y}-${mm}-${dd}`;
  return isWellFormedPickupYMD(ymd) ? ymd : null;
}

export function isDessertFlanLine(line: OrderItemLine): boolean {
  if (line.isSample) return false;
  const cat = (line.category ?? "").toLowerCase();
  if (cat.includes("dessert")) return true;
  if (/flan|leche flan/i.test(line.name)) return true;
  return false;
}

export function parseOrderItemsJson(s: string | null | undefined): OrderItemLine[] {
  try {
    const v = JSON.parse(s ?? "[]") as unknown;
    return Array.isArray(v) ? (v as OrderItemLine[]) : [];
  } catch {
    return [];
  }
}

const STATUS_OK = new Set<string>(ORDER_STATUSES_COUNTING_TOWARD_CAPACITY);

export type PrepSummaryComputed = {
  main: PrepLine[];
  dessert: PrepLine[];
  meta: {
    weekThursdayYmd: string;
    fri: string;
    sat: string;
    weekStartSun: string;
    weekEndSat: string;
    /** Orders with pickup on Fri or Sat this week (weekend batch). */
    weekendOrderCount: number;
    /** All orders with pickup any day Sun–Sat this week (after filters). */
    weekOrderCount: number;
    statusesIncluded: string[];
  };
};

function mapToSortedLines(m: Map<string, { label: string; qty: number }>): PrepLine[] {
  return [...m.entries()]
    .map(([key, v]) => ({
      key,
      label: v.label,
      quantity: v.qty,
      source: "computed" as const,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Main prep: non-dessert lines for any pickup Sun–Sat this week (so you see
 * totals before Thursday and for weekday pickups too). Desserts & flan: same
 * week, including Tue–Thu flan slots.
 */
export function aggregatePrepForWeek(
  orders: Array<{
    pickupDate: string | null;
    items: string;
    status: string;
    isDemo: boolean;
  }>,
  weekThursdayYmd: string
): PrepSummaryComputed {
  const { fri, sat } = getThisWeeksFridaySaturdayAfterThursday(weekThursdayYmd);
  const { sun, sat: weekEndSat } = weekSunToSatFromThursday(weekThursdayYmd);

  const mainMap = new Map<string, { label: string; qty: number }>();
  const dessertMap = new Map<string, { label: string; qty: number }>();
  let weekendOrderCount = 0;
  let weekOrderCount = 0;

  for (const o of orders) {
    if (o.isDemo) continue;
    if (!STATUS_OK.has(o.status)) continue;
    const pdNorm = normalizePickupYmd(o.pickupDate);
    if (!pdNorm) continue;
    if (pdNorm < sun || pdNorm > weekEndSat) continue;

    const items = parseOrderItemsJson(o.items);
    if (items.length === 0) continue;

    weekOrderCount += 1;

    const isWeekendPickup = pdNorm === fri || pdNorm === sat;
    if (isWeekendPickup) weekendOrderCount += 1;

    for (const line of items) {
      if (line.isSample) continue;
      if (isDessertFlanLine(line)) continue;
      const q = line.quantity ?? 0;
      if (q <= 0) continue;
      const key = itemLineKey(line);
      const label = itemLineLabel(line);
      const prev = mainMap.get(key);
      mainMap.set(key, { label, qty: (prev?.qty ?? 0) + q });
    }

    for (const line of items) {
      if (line.isSample) continue;
      if (!isDessertFlanLine(line)) continue;
      const q = line.quantity ?? 0;
      if (q <= 0) continue;
      const key = itemLineKey(line);
      const label = itemLineLabel(line);
      const prev = dessertMap.get(key);
      dessertMap.set(key, { label, qty: (prev?.qty ?? 0) + q });
    }
  }

  return {
    main: mapToSortedLines(mainMap),
    dessert: mapToSortedLines(dessertMap),
    meta: {
      weekThursdayYmd,
      fri,
      sat,
      weekStartSun: sun,
      weekEndSat,
      weekendOrderCount,
      weekOrderCount,
      statusesIncluded: [...ORDER_STATUSES_COUNTING_TOWARD_CAPACITY],
    },
  };
}

export function mergePrepWithOverrides(
  computed: PrepSummaryComputed,
  state: PrepSummaryOverrideState
): { main: PrepLineMerged[]; dessert: PrepLineMerged[] } {
  const hidden = new Set(state.hiddenKeys ?? []);
  const qo = state.qtyOverrides ?? {};
  const notes = state.lineNotes ?? {};

  function applySection(lines: PrepLine[], section: "main" | "dessert"): PrepLineMerged[] {
    const out: PrepLineMerged[] = [];
    for (const row of lines) {
      if (hidden.has(row.key)) continue;
      let qty = row.quantity;
      if (Object.prototype.hasOwnProperty.call(qo, row.key)) {
        qty = qo[row.key]!;
      }
      if (qty <= 0) continue;
      const note = notes[row.key]?.trim();
      out.push({
        key: row.key,
        label: row.label,
        quantity: qty,
        source: "computed",
        ...(note ? { note } : {}),
      });
    }
    for (const ex of state.extraLines ?? []) {
      if (ex.section !== section || ex.qty <= 0) continue;
      out.push({
        key: `extra:${ex.id}`,
        label: ex.label.trim(),
        quantity: ex.qty,
        source: "extra",
      });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }

  return {
    main: applySection(computed.main, "main"),
    dessert: applySection(computed.dessert, "dessert"),
  };
}
