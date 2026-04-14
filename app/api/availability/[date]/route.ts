import { NextRequest, NextResponse } from "next/server";
import {
  getPickupSlotsForDateYmd,
  isPickupDateOpenInDb,
} from "@/lib/availability-server";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailableError } from "@/lib/safe-db";

/** Public: time slots for one YYYY-MM-DD (only if that date is open in DB). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } }
) {
  const date = decodeURIComponent(params.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  try {
    if (!(await isPickupDateOpenInDb(date))) {
      return NextResponse.json({ date, slots: [], note: null as string | null });
    }
    const row = await prisma.availability.findUnique({ where: { date } });
    const slots = await getPickupSlotsForDateYmd(date);
    return NextResponse.json({
      date,
      slots,
      note: row?.note?.trim() || null,
    });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[mrk] DATABASE_URL unreachable — no slots for this date. Fix .env.local."
        );
        return NextResponse.json({ date, slots: [], note: null as string | null });
      }
      return NextResponse.json(
        { error: "Pickup availability is temporarily unavailable." },
        { status: 503 }
      );
    }
    throw e;
  }
}
