import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { removeAvailabilityEvent } from "@/lib/googleCalendar";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { date: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const date = decodeURIComponent(params.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  await prisma.availability.deleteMany({ where: { date } });
  void removeAvailabilityEvent(date);
  return NextResponse.json({ ok: true });
}
