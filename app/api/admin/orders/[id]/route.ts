import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { toAdminOrderClientRow } from "@/lib/admin-order-client";

/** Admin-only: fetch one order by id or order # (for receipt print after manual entry). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = decodeURIComponent(params.id ?? "").trim();
  if (!raw) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ orderNumber: raw }, { id: raw }] },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = toAdminOrderClientRow(order, "");
  return NextResponse.json({ order: row });
}
