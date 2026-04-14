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
