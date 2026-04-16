import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = (params.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing subscriber id" }, { status: 400 });
  }
  try {
    await prisma.subscriber.delete({ where: { id } });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }
    console.error("[admin/subscribers] DELETE failed:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
