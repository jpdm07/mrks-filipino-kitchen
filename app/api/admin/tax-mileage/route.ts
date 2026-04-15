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
  const rows = await prisma.taxMileageLog.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 2000,
  });
  return NextResponse.json({ mileage: rows });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    date?: string;
    miles?: number;
    purpose?: string;
    routeFrom?: string | null;
    routeTo?: string | null;
    notes?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const date = (body.date ?? "").trim();
  const purpose = (body.purpose ?? "").trim();
  const miles = Number(body.miles);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Valid date (YYYY-MM-DD) required" }, { status: 400 });
  }
  if (!purpose) {
    return NextResponse.json({ error: "Purpose is required" }, { status: 400 });
  }
  if (!Number.isFinite(miles) || miles <= 0) {
    return NextResponse.json(
      { error: "Miles must be a positive number" },
      { status: 400 }
    );
  }
  const row = await prisma.taxMileageLog.create({
    data: {
      date,
      miles,
      purpose,
      routeFrom: (body.routeFrom ?? "").trim() || null,
      routeTo: (body.routeTo ?? "").trim() || null,
      notes: (body.notes ?? "").trim() || null,
    },
  });
  return NextResponse.json({ mileage: row });
}
