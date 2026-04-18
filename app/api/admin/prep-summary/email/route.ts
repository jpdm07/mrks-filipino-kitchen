import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { loadPrepSummaryPayload } from "@/lib/prep-summary-load";
import { getThursdayYmdOfSameWeek, isWellFormedPickupYMD } from "@/lib/pickup-lead-time";
import { prisma } from "@/lib/prisma";
import { sendPrepSummaryEmail } from "@/lib/send-prep-summary-email";

export const dynamic = "force-dynamic";

function normalizeWeekThursday(raw: string | null): string | null {
  const t = (raw ?? "").trim();
  if (!isWellFormedPickupYMD(t)) return null;
  return getThursdayYmdOfSameWeek(t);
}

/** POST: send prep summary email for a week (manual; same content as cron). */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const week = normalizeWeekThursday((body as { week?: string }).week ?? null);
  if (!week) {
    return NextResponse.json({ error: "Invalid or missing week" }, { status: 400 });
  }

  try {
    const data = await loadPrepSummaryPayload(week);
    const result = await sendPrepSummaryEmail({
      weekThursdayYmd: week,
      fri: data.meta.fri,
      sat: data.meta.sat,
      main: data.merged.main,
      dessert: data.merged.dessert,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    await prisma.prepSummaryEmailLog.upsert({
      where: { weekThursdayYmd: week },
      create: { weekThursdayYmd: week },
      update: { sentAt: new Date() },
    });
    const refreshed = await loadPrepSummaryPayload(week);
    return NextResponse.json({ ok: true, emailSentAt: refreshed.emailSentAt, ...refreshed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Send failed";
    console.error("[prep-summary email]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
