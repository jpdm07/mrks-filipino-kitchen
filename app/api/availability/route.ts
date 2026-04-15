import { NextRequest, NextResponse } from "next/server";
import {
  buildKitchenOpenDatesPayload,
  buildUnifiedDisplayOpenDatesPayload,
} from "@/lib/kitchen-availability-merge";
import { kickGoogleAvailabilityBackgroundSync } from "@/lib/google-availability-stale-sync";
import {
  isDatabaseUnavailableError,
  prismaDiagnosticCode,
} from "@/lib/safe-db";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

/**
 * Public pickup dates: kitchen merge + DB (see `buildKitchenOpenDatesPayload`).
 * Use `cartMode=all` for a view-only union (mixed + flan weekdays) on `/availability`.
 */
export async function GET(req: NextRequest) {
  if (!process.env.DATABASE_URL?.trim()) {
    console.warn("[mrk] DATABASE_URL is missing in this deployment environment.");
    return NextResponse.json(
      { openDates: [], notes: {} },
      {
        headers: {
          ...NO_STORE,
          "x-mrk-db": "unreachable",
          "x-mrk-open-count": "0",
          "x-mrk-db-reason": "missing-database-url",
        },
      }
    );
  }

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
  const cartParam = searchParams.get("cartMode") ?? "mixed";
  const cartMode =
    cartParam === "flan" ? "flan" : cartParam === "all" ? "all" : "mixed";
  const mainNeed = Number(searchParams.get("mainNeed") || "0");
  const flanNeed = Number(searchParams.get("flanNeed") || "0");

  try {
    kickGoogleAvailabilityBackgroundSync();
    const mainN = Number.isFinite(mainNeed) ? mainNeed : 0;
    const flanN = Number.isFinite(flanNeed) ? flanNeed : 0;
    const payload =
      cartMode === "all"
        ? await buildUnifiedDisplayOpenDatesPayload(from, to, {
            mainMinutesNeeded: mainN,
            flanRamekinsNeeded: flanN,
          })
        : await buildKitchenOpenDatesPayload(from, to, {
            cartFlanOnly: cartMode === "flan",
            mainMinutesNeeded: mainN,
            flanRamekinsNeeded: flanN,
          });
    return NextResponse.json(payload, {
      headers: {
        ...NO_STORE,
        "x-mrk-db": "ok",
        "x-mrk-open-count": String(payload.openDates.length),
      },
    });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      const code = prismaDiagnosticCode(e);
      const hint = e instanceof Error ? e.message.split("\n")[0] : String(e);
      console.warn(
        "[mrk] DATABASE_URL unreachable — returning empty pickup dates (storefront stays up).",
        code ?? "(no P-code)",
        hint
      );
      const headers: Record<string, string> = {
        ...NO_STORE,
        "x-mrk-db": "unreachable",
        "x-mrk-open-count": "0",
      };
      if (code) headers["x-mrk-prisma-code"] = code;
      return NextResponse.json({ openDates: [], notes: {} }, { headers });
    }
    throw e;
  }
}
