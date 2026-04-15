import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const startYmd = req.nextUrl.searchParams.get("startDate")?.trim();
  const endYmd = req.nextUrl.searchParams.get("endDate")?.trim();
  const where =
    startYmd &&
    endYmd &&
    /^\d{4}-\d{2}-\d{2}$/.test(startYmd) &&
    /^\d{4}-\d{2}-\d{2}$/.test(endYmd)
      ? { date: { gte: startYmd, lte: endYmd } }
      : {};
  const rows = await prisma.taxSupportingEntry.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 2000,
  });
  return NextResponse.json({ entries: rows });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    date?: string;
    category?: string;
    title?: string;
    description?: string | null;
    amount?: number | null;
    notes?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const date = (body.date ?? "").trim();
  const category = (body.category ?? "").trim();
  const title = (body.title ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Valid date (YYYY-MM-DD) required" }, { status: 400 });
  }
  if (!category || !title) {
    return NextResponse.json(
      { error: "Category and title are required" },
      { status: 400 }
    );
  }
  let amount: number | null = null;
  if (
    body.amount != null &&
    String(body.amount).trim() !== "" &&
    !(typeof body.amount === "number" && Number.isNaN(body.amount))
  ) {
    const a = Number(body.amount);
    if (!Number.isFinite(a)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    amount = a;
  }
  const row = await prisma.taxSupportingEntry.create({
    data: {
      date,
      category,
      title,
      description: (body.description ?? "").trim() || null,
      amount,
      notes: (body.notes ?? "").trim() || null,
    },
  });
  return NextResponse.json({ entry: row });
}
