import { NextRequest, NextResponse } from "next/server";
import {
  getPickupSlotsForDateYmd,
  isPickupDateOpenInDb,
} from "@/lib/availability-server";
import { maybeSyncGoogleAvailabilityFromPublicRequest } from "@/lib/google-availability-stale-sync";
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
    try {
      await maybeSyncGoogleAvailabilityFromPublicRequest();
    } catch (e) {
      console.warn("[mrk] Google availability auto-sync:", e);
    }
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
      console.warn(
        "[mrk] DATABASE_URL unreachable — empty slots for date (storefront stays up)."
      );
      return NextResponse.json({ date, slots: [], note: null as string | null });
    }
    throw e;
  }
}
