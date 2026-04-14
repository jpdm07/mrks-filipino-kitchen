import { NextRequest, NextResponse } from "next/server";
import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";
import { syncGoogleCalendarAvailabilityToDatabase } from "@/lib/availability-google-sync";
import { isAuthorizedCronGet } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/** Vercel Cron (vercel.json) + optional manual GET: Google Calendar → DB. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronGet(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = getTodayInPickupTimezoneYMD();
  const to = addCalendarDaysYMD(t, 120);
  const result = await syncGoogleCalendarAvailabilityToDatabase(t, to, {
    closeMissingInRange: false,
  });
  if (result.error) {
    return NextResponse.json(
      { ok: false, ...result },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, ...result });
}
