import { NextRequest, NextResponse } from "next/server";
import { buildKitchenOpenDatesPayload } from "@/lib/kitchen-availability-merge";
import {
  ALL_ITEMS_DAY_NOTE,
  FLAN_ONLY_DAY_NOTE,
  getKitchenSlotsForDate,
} from "@/lib/kitchen-schedule";
import { kickGoogleAvailabilityBackgroundSync } from "@/lib/google-availability-stale-sync";
import { isDatabaseUnavailableError } from "@/lib/safe-db";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

/** Public: time slots for one YYYY-MM-DD (kitchen schedule + Saturday DB + cart mode). */
export async function GET(
  req: NextRequest,
  { params }: { params: { date: string } }
) {
  const date = decodeURIComponent(params.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Invalid date" },
      { status: 400, headers: NO_STORE }
    );
  }

  const { searchParams } = new URL(req.url);
  const cartMode = searchParams.get("cartMode") === "flan" ? "flan" : "mixed";
  const mainNeed = Number(searchParams.get("mainNeed") || "0");
  const flanNeed = Number(searchParams.get("flanNeed") || "0");
  const cartFlanOnly = cartMode === "flan";

  try {
    kickGoogleAvailabilityBackgroundSync();

    const { openDates, notes } = await buildKitchenOpenDatesPayload(
      date,
      date,
      {
        cartFlanOnly,
        mainMinutesNeeded: Number.isFinite(mainNeed) ? mainNeed : 0,
        flanRamekinsNeeded: Number.isFinite(flanNeed) ? flanNeed : 0,
      }
    );

    const isOpen = openDates.includes(date);
    if (!isOpen) {
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

    const slots = await getKitchenSlotsForDate(date, cartFlanOnly);
    const note =
      notes[date]?.trim() ||
      (cartFlanOnly ? FLAN_ONLY_DAY_NOTE : ALL_ITEMS_DAY_NOTE);

    return NextResponse.json(
      {
        date,
        isOpen: true,
        slots,
        note,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      console.warn(
        "[mrk] DATABASE_URL unreachable — empty slots for date (storefront stays up)."
      );
      return NextResponse.json(
        { date, isOpen: false, slots: [], note: null as string | null },
        { headers: NO_STORE }
      );
    }
    throw e;
  }
}
