import { NextResponse } from "next/server";
import { getWeekCapacitySnapshots } from "@/lib/capacity-service";
import { getTodayInPickupTimezoneYMD } from "@/lib/pickup-lead-time";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

/** Public: current week + next 3 weeks capacity (main cook + flan). */
export async function GET() {
  const from = getTodayInPickupTimezoneYMD();
  const weeks = await getWeekCapacitySnapshots(from, 4);
  return NextResponse.json(weeks, { headers: NO_STORE });
}
