import { NextRequest, NextResponse } from "next/server";
import { getPublicAvailabilityWhitelistPayload } from "@/lib/availability-server";
import { maybeSyncGoogleAvailabilityFromPublicRequest } from "@/lib/google-availability-stale-sync";
import { isDatabaseUnavailableError } from "@/lib/safe-db";

/**
 * Public whitelist: only dates with an Availability row where isOpen === true.
 * Empty openDates means no pickup days are open for this range.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json(
      { error: "Query from=YYYY-MM-DD&to=YYYY-MM-DD required" },
      { status: 400 }
    );
  }
  if (from > to) {
    return NextResponse.json({ error: "from must be <= to" }, { status: 400 });
  }
  try {
    try {
      await maybeSyncGoogleAvailabilityFromPublicRequest();
    } catch (e) {
      console.warn("[mrk] Google availability auto-sync:", e);
    }
    const payload = await getPublicAvailabilityWhitelistPayload(from, to);
    return NextResponse.json(payload);
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      console.warn(
        "[mrk] DATABASE_URL unreachable — returning empty pickup dates (storefront stays up)."
      );
      return NextResponse.json({ openDates: [], notes: {} });
    }
    throw e;
  }
}
