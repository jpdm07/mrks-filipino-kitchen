import { prisma } from "@/lib/prisma";
import type { OrderItemLine } from "@/lib/order-types";
import {
  ORDER_STATUSES_COUNTING_TOWARD_CAPACITY,
  MAIN_COOK_CAP_MINUTES,
  FLAN_WEEKLY_CAP_RAMEKINS,
} from "@/lib/menu-capacity-catalog";
import { totalCookContribution } from "@/lib/menu-cook-capacity";
import { mondayOfCalendarWeekContaining, saturdayOfPickupWindow } from "@/lib/pickup-week";
import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";

export type WeekCapacitySnapshot = {
  weekStart: string;
  weekEnd: string;
  mainCookUsed: number;
  mainCookCap: number;
  mainCookRemaining: number;
  mainSoldOut: boolean;
  flanUsed: number;
  flanCap: number;
  flanRemaining: number;
  flanSoldOut: boolean;
};

function parseItemsJson(raw: string): OrderItemLine[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as OrderItemLine[]) : [];
  } catch {
    return [];
  }
}

function manualSoldOutAppliesToWeek(
  manualMonday: string | null | undefined,
  weekMonday: string
): boolean {
  const m = manualMonday?.trim();
  if (!m) return false;
  const thisMon = mondayOfCalendarWeekContaining(getTodayInPickupTimezoneYMD());
  if (m !== thisMon) return false;
  return m === weekMonday;
}

/**
 * Aggregate main cook minutes and flan ramekins for orders whose pickup falls Mon–Sat of `weekMonday` week.
 */
type OrderFindTx = {
  order: { findMany: typeof prisma.order.findMany };
};

export async function computeWeekUsageFromOrdersWithTx(
  tx: OrderFindTx,
  weekMondayYmd: string
): Promise<{ mainUsed: number; flanUsed: number }> {
  const sat = saturdayOfPickupWindow(weekMondayYmd);
  const orders = await tx.order.findMany({
    where: {
      isDemo: false,
      status: { in: [...ORDER_STATUSES_COUNTING_TOWARD_CAPACITY] },
      pickupDate: { not: null, gte: weekMondayYmd, lte: sat },
    },
    select: { items: true },
  });

  let mainUsed = 0;
  let flanUsed = 0;
  for (const o of orders) {
    const lines = parseItemsJson(o.items);
    const t = totalCookContribution(lines);
    mainUsed += t.mainMinutes;
    flanUsed += t.flanRamekins;
  }
  return { mainUsed, flanUsed };
}

export async function computeWeekUsageFromOrders(
  weekMondayYmd: string
): Promise<{ mainUsed: number; flanUsed: number }> {
  const sat = saturdayOfPickupWindow(weekMondayYmd);
  const orders = await prisma.order.findMany({
    where: {
      isDemo: false,
      status: { in: [...ORDER_STATUSES_COUNTING_TOWARD_CAPACITY] },
      pickupDate: { not: null, gte: weekMondayYmd, lte: sat },
    },
    select: { items: true },
  });

  let mainUsed = 0;
  let flanUsed = 0;
  for (const o of orders) {
    const lines = parseItemsJson(o.items);
    const t = totalCookContribution(lines);
    mainUsed += t.mainMinutes;
    flanUsed += t.flanRamekins;
  }
  return { mainUsed, flanUsed };
}

export async function getWeekCapacitySnapshot(
  weekMondayYmd: string,
  settings: { manualSoldOutWeekStart: string | null }
): Promise<WeekCapacitySnapshot> {
  const sat = saturdayOfPickupWindow(weekMondayYmd);
  const { mainUsed, flanUsed } = await computeWeekUsageFromOrders(weekMondayYmd);

  const manualClose = manualSoldOutAppliesToWeek(
    settings.manualSoldOutWeekStart,
    weekMondayYmd
  );

  const mainCookRemaining = Math.max(0, MAIN_COOK_CAP_MINUTES - mainUsed);
  const flanRemaining = Math.max(0, FLAN_WEEKLY_CAP_RAMEKINS - flanUsed);

  const mainSoldOut =
    manualClose || mainUsed >= MAIN_COOK_CAP_MINUTES;
  const flanSoldOut =
    manualClose || flanUsed >= FLAN_WEEKLY_CAP_RAMEKINS;

  return {
    weekStart: weekMondayYmd,
    weekEnd: sat,
    mainCookUsed: mainUsed,
    mainCookCap: MAIN_COOK_CAP_MINUTES,
    mainCookRemaining,
    mainSoldOut,
    flanUsed,
    flanCap: FLAN_WEEKLY_CAP_RAMEKINS,
    flanRemaining,
    flanSoldOut,
  };
}

/** Next N weeks starting from the week containing `fromYmd` (usually today). */
export async function getWeekCapacitySnapshots(
  fromYmd: string,
  numWeeks: number
): Promise<WeekCapacitySnapshot[]> {
  const settings = await prisma.kitchenCapacitySettings.findUnique({
    where: { id: "default" },
  });
  const manual = settings?.manualSoldOutWeekStart ?? null;

  const startMonday = mondayOfCalendarWeekContaining(fromYmd);
  const out: WeekCapacitySnapshot[] = [];
  let w = startMonday;
  for (let i = 0; i < numWeeks; i++) {
    out.push(
      await getWeekCapacitySnapshot(w, { manualSoldOutWeekStart: manual })
    );
    w = addCalendarDaysYMD(w, 7);
  }
  return out;
}

/** Re-export for order route — compute usage including a hypothetical new order. */
export async function wouldExceedCapacityForPickupWeek(
  pickupDateYmd: string,
  lines: OrderItemLine[],
  settings: { manualSoldOutWeekStart: string | null }
): Promise<{ ok: boolean; reason?: "main" | "flan" | "manual" }> {
  const weekMon = mondayOfCalendarWeekContaining(pickupDateYmd);
  const snap = await getWeekCapacitySnapshot(weekMon, settings);
  if (manualSoldOutAppliesToWeek(settings.manualSoldOutWeekStart, weekMon)) {
    return { ok: false, reason: "manual" };
  }

  const add = totalCookContribution(lines);
  if (add.mainMinutes > 0 && snap.mainCookUsed + add.mainMinutes > MAIN_COOK_CAP_MINUTES) {
    return { ok: false, reason: "main" };
  }
  if (add.flanRamekins > 0 && snap.flanUsed + add.flanRamekins > FLAN_WEEKLY_CAP_RAMEKINS) {
    return { ok: false, reason: "flan" };
  }
  return { ok: true };
}

/** Same as {@link wouldExceedCapacityForPickupWeek} but reads usage inside a transaction (race-safe). */
export async function wouldExceedCapacityForPickupWeekWithTx(
  tx: OrderFindTx,
  pickupDateYmd: string,
  lines: OrderItemLine[],
  settings: { manualSoldOutWeekStart: string | null }
): Promise<{ ok: boolean; reason?: "main" | "flan" | "manual" }> {
  const weekMon = mondayOfCalendarWeekContaining(pickupDateYmd);
  if (manualSoldOutAppliesToWeek(settings.manualSoldOutWeekStart, weekMon)) {
    return { ok: false, reason: "manual" };
  }

  const { mainUsed, flanUsed } = await computeWeekUsageFromOrdersWithTx(
    tx,
    weekMon
  );

  const add = totalCookContribution(lines);
  if (
    add.mainMinutes > 0 &&
    mainUsed + add.mainMinutes > MAIN_COOK_CAP_MINUTES
  ) {
    return { ok: false, reason: "main" };
  }
  if (
    add.flanRamekins > 0 &&
    flanUsed + add.flanRamekins > FLAN_WEEKLY_CAP_RAMEKINS
  ) {
    return { ok: false, reason: "flan" };
  }
  return { ok: true };
}

export function contributionForOrderLines(lines: OrderItemLine[]) {
  return totalCookContribution(lines);
}
