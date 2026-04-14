import { NextRequest, NextResponse } from "next/server";
import { getPublicAvailabilityWhitelistPayload } from "@/lib/availability-server";
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
    const payload = await getPublicAvailabilityWhitelistPayload(from, to);
    return NextResponse.json(payload);
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[mrk] DATABASE_URL unreachable — returning empty pickup dates. Use your Neon (or other) URL in .env.local."
        );
        return NextResponse.json({ openDates: [], notes: {} });
      }
      return NextResponse.json(
        { error: "Pickup availability is temporarily unavailable." },
        { status: 503 }
      );
    }
    throw e;
  }
}
