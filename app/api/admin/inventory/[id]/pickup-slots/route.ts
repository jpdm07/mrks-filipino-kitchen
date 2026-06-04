import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { slotWindowFromLabelsJson } from "@/lib/inventory-pickup-slots";
import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const inventoryItemId = parseInt(params.id, 10);
  if (!Number.isFinite(inventoryItemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const slotFromYmd = addCalendarDaysYMD(getTodayInPickupTimezoneYMD(), -7);
  const rows = await prisma.inventoryPickupSlot.findMany({
    where: {
      inventoryItemId,
      dateYmd: { gte: slotFromYmd },
    },
    orderBy: [{ dateYmd: "asc" }, { id: "asc" }],
  });

  const slots = rows.map((s) => {
    const window = slotWindowFromLabelsJson(s.slotLabelsJson);
    return {
      id: s.id,
      dateYmd: s.dateYmd,
      startLabel: window?.startLabel ?? "11:00 AM",
      endLabel: window?.endLabel ?? "2:00 PM",
      maxOrders: s.maxOrders,
      ordersFilled: s.ordersFilled,
      autoCloseWhenZero: s.autoCloseWhenZero,
      closed: s.closed,
    };
  });

  return NextResponse.json({ slots });
}
