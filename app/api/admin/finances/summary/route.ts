import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

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

function parseRange(searchParams: URLSearchParams): {
  start: Date;
  end: Date;
  startYmd: string;
  endYmd: string;
} {
  const startYmd = (searchParams.get("startDate") ?? "").trim();
  const endYmd = (searchParams.get("endDate") ?? "").trim();
  const now = new Date();
  const defStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(endYmd)) {
    return {
      start: defStart,
      end: defEnd,
      startYmd: defStart.toISOString().slice(0, 10),
      endYmd: defEnd.toISOString().slice(0, 10),
    };
  }
  const start = new Date(`${startYmd}T00:00:00.000Z`);
  const end = new Date(`${endYmd}T23:59:59.999Z`);
  return { start, end, startYmd, endYmd };
}

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { start, end, startYmd, endYmd } = parseRange(req.nextUrl.searchParams);

  const orders = await prisma.order.findMany({
    where: {
      status: "Confirmed",
      createdAt: { gte: start, lte: end },
    },
    select: { total: true },
  });
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgRevenuePerOrder =
    totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: startYmd, lte: endYmd },
    },
  });
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = Math.round((totalRevenue - totalExpenses) * 100) / 100;

  const expensesByCategory: Record<string, number> = {};
  for (const c of CATEGORIES) expensesByCategory[c] = 0;
  for (const e of expenses) {
    const k = CATEGORIES.includes(e.category as (typeof CATEGORIES)[number])
      ? e.category
      : "Other";
    expensesByCategory[k] = (expensesByCategory[k] ?? 0) + e.amount;
  }

  return NextResponse.json({
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit,
    totalOrders,
    avgRevenuePerOrder,
    expensesByCategory,
    startDate: startYmd,
    endDate: endYmd,
  });
}
