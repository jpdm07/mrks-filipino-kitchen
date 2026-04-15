import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { mondayOfCalendarWeekContaining } from "@/lib/pickup-week";
import { getTodayInPickupTimezoneYMD } from "@/lib/pickup-lead-time";

export const dynamic = "force-dynamic";

/**
 * POST body: { action: "mark" | "reset" }
 * mark — force current Mon–Sat week sold out (manual flag = this week’s Monday).
 * reset — clear manual flag.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { action?: string };
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = (body.action ?? "").trim();
  const thisMonday = mondayOfCalendarWeekContaining(
    getTodayInPickupTimezoneYMD()
  );

  if (action === "mark") {
    await prisma.kitchenCapacitySettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        manualSoldOutWeekStart: thisMonday,
      },
      update: { manualSoldOutWeekStart: thisMonday },
    });
    return NextResponse.json({ ok: true, manualSoldOutWeekStart: thisMonday });
  }

  if (action === "reset") {
    await prisma.kitchenCapacitySettings.upsert({
      where: { id: "default" },
      create: { id: "default", manualSoldOutWeekStart: null },
      update: { manualSoldOutWeekStart: null },
    });
    return NextResponse.json({ ok: true, manualSoldOutWeekStart: null });
  }

  return NextResponse.json(
    { error: 'action must be "mark" or "reset"' },
    { status: 400 }
  );
}
