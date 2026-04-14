import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = params.id;
  const body = (await req.json()) as {
    date?: string;
    store?: string;
    category?: string;
    description?: string;
    amount?: number;
    notes?: string | null;
    receiptData?: unknown;
  };
  const data: Record<string, unknown> = { isEdited: true };
  if (body.date != null) data.date = body.date.trim();
  if (body.store != null) data.store = body.store.trim();
  if (body.category != null) data.category = body.category.trim();
  if (body.description != null) data.description = body.description.trim();
  if (body.amount != null) {
    const a = Number(body.amount);
    if (!Number.isFinite(a) || a <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    data.amount = a;
  }
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (body.receiptData !== undefined) {
    data.receiptData =
      body.receiptData != null ? JSON.stringify(body.receiptData) : null;
  }
  const row = await prisma.expense.update({ where: { id }, data });
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.expense.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
