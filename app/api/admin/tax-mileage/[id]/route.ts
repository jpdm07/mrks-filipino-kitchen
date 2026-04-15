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

  const data: {
    date?: string;
    miles?: number;
    purpose?: string;
    routeFrom?: string | null;
    routeTo?: string | null;
    notes?: string | null;
  } = {};

  if (body.date != null) {
    const d = String(body.date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    data.date = d;
  }
  if (body.miles != null) {
    const m = Number(body.miles);
    if (!Number.isFinite(m) || m <= 0) {
      return NextResponse.json({ error: "Invalid miles" }, { status: 400 });
    }
    data.miles = m;
  }
  if (body.purpose != null) {
    const p = String(body.purpose).trim();
    if (!p) return NextResponse.json({ error: "Purpose required" }, { status: 400 });
    data.purpose = p;
  }
  if (body.routeFrom !== undefined) {
    data.routeFrom = body.routeFrom ? String(body.routeFrom).trim() : null;
  }
  if (body.routeTo !== undefined) {
    data.routeTo = body.routeTo ? String(body.routeTo).trim() : null;
  }
  if (body.notes !== undefined) {
    data.notes = body.notes ? String(body.notes).trim() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const row = await prisma.taxMileageLog.update({
      where: { id },
      data,
    });
    return NextResponse.json({ mileage: row });
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
    await prisma.taxMileageLog.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
