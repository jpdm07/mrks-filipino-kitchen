import { NextRequest, NextResponse } from "next/server";
import {
  getPublicPickupSlotsForDateYmd,
  isPickupDateOpenInDb,
} from "@/lib/availability-server";
import { kickGoogleAvailabilityBackgroundSync } from "@/lib/google-availability-stale-sync";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailableError } from "@/lib/safe-db";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

/** Public: time slots for one YYYY-MM-DD (only if that date is open in DB). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } }
) {
  const date = decodeURIComponent(params.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Invalid date" },
      { status: 400, headers: NO_STORE }
    );
  }
  try {
    kickGoogleAvailabilityBackgroundSync();
    if (!(await isPickupDateOpenInDb(date))) {
      return NextResponse.json(
        {
          date,
          isOpen: false,
          slots: [],
          note: null as string | null,
        },
        { headers: NO_STORE }
      );
    }
    const row = await prisma.availability.findUnique({ where: { date } });
    const slots = await getPublicPickupSlotsForDateYmd(date);
    return NextResponse.json(
      {
        date,
        isOpen: true,
        slots,
        note: row?.note?.trim() || null,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      console.warn(
        "[mrk] DATABASE_URL unreachable — empty slots for date (storefront stays up)."
      );
      return NextResponse.json(
        { date, slots: [], note: null as string | null },
        { headers: NO_STORE }
      );
    }
    throw e;
  }
}
