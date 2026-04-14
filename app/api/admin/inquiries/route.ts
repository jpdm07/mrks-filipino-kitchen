import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const inquiries = await prisma.inquiry.findMany({
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ inquiries });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string; isRead?: boolean };
  try {
    body = (await req.json()) as { id?: string; isRead?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = (body.id ?? "").trim();
  if (!id || typeof body.isRead !== "boolean") {
    return NextResponse.json(
      { error: "id and boolean isRead are required" },
      { status: 400 }
    );
  }
  try {
    await prisma.inquiry.update({
      where: { id },
      data: { isRead: body.isRead },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

const DELETE_MAX_IDS = 200;

export async function DELETE(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { ids?: unknown };
  try {
    body = (await req.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty ids array" },
      { status: 400 }
    );
  }
  const ids = body.ids
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ error: "No valid ids" }, { status: 400 });
  }
  if (ids.length > DELETE_MAX_IDS) {
    return NextResponse.json(
      { error: `Too many ids (max ${DELETE_MAX_IDS})` },
      { status: 400 }
    );
  }
  try {
    const result = await prisma.inquiry.deleteMany({
      where: { id: { in: ids } },
    });
    return NextResponse.json({ deleted: result.count });
  } catch (e) {
    console.error("[admin/inquiries] DELETE failed:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
