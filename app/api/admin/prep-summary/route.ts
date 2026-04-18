import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import {
  EMPTY_PREP_OVERRIDE_STATE,
  parsePrepOverrideState,
  type PrepSummaryOverrideState,
} from "@/lib/prep-summary";
import { loadPrepSummaryPayload } from "@/lib/prep-summary-load";
import { getThursdayYmdOfSameWeek, isWellFormedPickupYMD } from "@/lib/pickup-lead-time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeWeekThursday(raw: string | null): string | null {
  const t = (raw ?? "").trim();
  if (!isWellFormedPickupYMD(t)) return null;
  return getThursdayYmdOfSameWeek(t);
}

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const week = normalizeWeekThursday(req.nextUrl.searchParams.get("week"));
  if (!week) {
    return NextResponse.json({ error: "Invalid or missing week (use YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    const data = await loadPrepSummaryPayload(week);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load prep summary";
    console.error("[prep-summary GET]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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
  const b = body as { week?: string; state?: unknown; reset?: boolean };
  const week = normalizeWeekThursday(b.week ?? null);
  if (!week) {
    return NextResponse.json({ error: "Invalid or missing week" }, { status: 400 });
  }

  const stateToSave: PrepSummaryOverrideState = b.reset
    ? EMPTY_PREP_OVERRIDE_STATE
    : parsePrepOverrideState(JSON.stringify(b.state ?? {}));
  const stateJson = JSON.stringify(stateToSave);

  try {
    await prisma.prepSummaryWeekState.upsert({
      where: { weekThursdayYmd: week },
      create: { weekThursdayYmd: week, stateJson },
      update: { stateJson },
    });
    const data = await loadPrepSummaryPayload(week);
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save";
    console.error("[prep-summary POST]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
