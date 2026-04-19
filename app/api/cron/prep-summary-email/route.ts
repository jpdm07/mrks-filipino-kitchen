import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronGet } from "@/lib/cron-auth";
import { loadPrepSummaryPayload } from "@/lib/prep-summary-load";
import {
  getThursdayYmdOfSameWeek,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";
import { prisma } from "@/lib/prisma";
import { sendPrepSummaryEmail } from "@/lib/send-prep-summary-email";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron: daily (Central Thursday only) after weekend order cutoff.
 * Sends one email per pickup week; skips if already logged.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronGet(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayYmd = getTodayInPickupTimezoneYMD();
  const thursdayThisWeek = getThursdayYmdOfSameWeek(todayYmd);
  if (todayYmd !== thursdayThisWeek) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Not Thursday (America/Chicago calendar)",
      todayYmd,
    });
  }

  const week = thursdayThisWeek;

  try {
    const existing = await prisma.prepSummaryEmailLog.findUnique({
      where: { weekThursdayYmd: week },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Already sent this week",
        weekThursdayYmd: week,
        sentAt: existing.sentAt.toISOString(),
      });
    }

    const data = await loadPrepSummaryPayload(week);
    const result = await sendPrepSummaryEmail({
      weekThursdayYmd: week,
      fri: data.meta.fri,
      sat: data.meta.sat,
      main: data.merged.main,
      dessert: data.merged.dessert,
      byPickupDay: data.computed.byPickupDay,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, weekThursdayYmd: week },
        { status: 502 }
      );
    }

    await prisma.prepSummaryEmailLog.create({
      data: { weekThursdayYmd: week },
    });

    return NextResponse.json({
      ok: true,
      weekThursdayYmd: week,
      emailed: true,
    });
  } catch (e) {
    console.error("[cron prep-summary-email]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
