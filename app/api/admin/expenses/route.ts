import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("startDate")?.trim();
  const endDate = searchParams.get("endDate")?.trim();
  const category = searchParams.get("category")?.trim();
  const where: {
    date?: { gte?: string; lte?: string };
    category?: string;
  } = {};
  if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    where.date = { ...where.date, gte: startDate };
  }
  if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    where.date = { ...where.date, lte: endDate };
  }
  if (category) where.category = category;
  const rows = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ expenses: rows });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    date?: string;
    store?: string;
    category?: string;
    description?: string;
    amount?: number;
    notes?: string | null;
    receiptData?: unknown;
  };
  const date = (body.date ?? "").trim();
  const store = (body.store ?? "").trim();
  const category = (body.category ?? "").trim();
  const description = (body.description ?? "").trim();
  const amount = Number(body.amount);
  if (!date || !store || !category || !description || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid expense fields" }, { status: 400 });
  }
  const row = await prisma.expense.create({
    data: {
      date,
      store,
      category,
      description,
      amount,
      notes: body.notes?.trim() || null,
      receiptData:
        body.receiptData != null ? JSON.stringify(body.receiptData) : null,
    },
  });
  return NextResponse.json(row);
}
