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
  const id = decodeURIComponent(params.id).trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
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

  const data: {
    date?: string;
    category?: string;
    title?: string;
    description?: string | null;
    amount?: number | null;
    notes?: string | null;
  } = {};

  if (body.date != null) {
    const d = String(body.date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    data.date = d;
  }
  if (body.category != null) {
    const c = String(body.category).trim();
    if (!c) return NextResponse.json({ error: "Category required" }, { status: 400 });
    data.category = c;
  }
  if (body.title != null) {
    const t = String(body.title).trim();
    if (!t) return NextResponse.json({ error: "Title required" }, { status: 400 });
    data.title = t;
  }
  if (body.description !== undefined) {
    data.description = body.description ? String(body.description).trim() : null;
  }
  if (body.amount !== undefined) {
    if (body.amount === null || body.amount === "") {
      data.amount = null;
    } else {
      const a = Number(body.amount);
      if (!Number.isFinite(a)) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      data.amount = a;
    }
  }
  if (body.notes !== undefined) {
    data.notes = body.notes ? String(body.notes).trim() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const row = await prisma.taxSupportingEntry.update({
      where: { id },
      data,
    });
    return NextResponse.json({ entry: row });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = decodeURIComponent(params.id).trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  try {
    await prisma.taxSupportingEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
