import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { ORDER_STATUS_CONFIRMED } from "@/lib/order-payment";
import {
  chicagoCalendarYmd,
  nextChicagoCalendarDay,
  utcBoundsForChicagoYmd,
} from "@/lib/chicago-day-bounds";
import { ORDER_FULFILLMENT } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Live totals for the earnings planner page: confirmed, non-demo orders placed
 * between Chicago midnight boundaries for “today” (and optional week — same basis as Finances).
 */
export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayYmd = chicagoCalendarYmd();
  const { start: todayStart, end: todayEnd } = utcBoundsForChicagoYmd(todayYmd);

  const todayOrders = await prisma.order.findMany({
    where: {
      status: ORDER_STATUS_CONFIRMED,
      isDemo: false,
      createdAt: { gte: todayStart, lte: todayEnd },
    },
    select: { total: true, tipAmount: true },
  });

  const todayCount = todayOrders.length;
  const todayRevenue =
    Math.round(todayOrders.reduce((s, o) => s + o.total, 0) * 100) / 100;
  const todayTips =
    Math.round(
      todayOrders.reduce((s, o) => s + (o.tipAmount ?? 0), 0) * 100
    ) / 100;

  // Calendar week Mon–Sun in Chicago containing “today”
  let weekStartYmd = todayYmd;
  {
    const { start: t0 } = utcBoundsForChicagoYmd(todayYmd);
    let ms = t0.getTime();
    for (let guard = 0; guard < 168; guard++) {
      const wd = new Date(ms).toLocaleDateString("en-US", {
        timeZone: ORDER_FULFILLMENT.PICKUP_TIMEZONE,
        weekday: "short",
      });
      if (wd === "Mon") {
        weekStartYmd = new Date(ms).toLocaleDateString("en-CA", {
          timeZone: ORDER_FULFILLMENT.PICKUP_TIMEZONE,
        });
        break;
      }
      ms -= 3600000;
    }
  }

  let weekEndYmd = weekStartYmd;
  for (let i = 0; i < 6; i++) {
    weekEndYmd = nextChicagoCalendarDay(weekEndYmd);
  }
  const weekStart = utcBoundsForChicagoYmd(weekStartYmd).start;
  const weekEnd = utcBoundsForChicagoYmd(weekEndYmd).end;

  const weekOrders = await prisma.order.findMany({
    where: {
      status: ORDER_STATUS_CONFIRMED,
      isDemo: false,
      createdAt: { gte: weekStart, lte: weekEnd },
    },
    select: { total: true, tipAmount: true },
  });

  const weekCount = weekOrders.length;
  const weekRevenue =
    Math.round(weekOrders.reduce((s, o) => s + o.total, 0) * 100) / 100;
  const weekTips =
    Math.round(weekOrders.reduce((s, o) => s + (o.tipAmount ?? 0), 0) * 100) /
    100;

  return NextResponse.json({
    timezone: ORDER_FULFILLMENT.PICKUP_TIMEZONE,
    todayYmd,
    today: {
      count: todayCount,
      revenue: todayRevenue,
      tips: todayTips,
    },
    week: {
      labelStart: weekStartYmd,
      labelEnd: weekEndYmd,
      count: weekCount,
      revenue: weekRevenue,
      tips: weekTips,
    },
  });
}
