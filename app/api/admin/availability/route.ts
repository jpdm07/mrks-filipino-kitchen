import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { getAdminAvailabilityMapForRange } from "@/lib/availability-server";
import { eachYmdInRangeInclusive } from "@/lib/availability-range";
import {
  ALL_ITEMS_DAY_NOTE,
  eveningPickupSlots1800to2000,
  FLAN_ONLY_DAY_NOTE,
} from "@/lib/kitchen-schedule";
import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
  ymdUtcWeekday,
} from "@/lib/pickup-lead-time";
import {
  slotsToDb,
  upsertAvailabilityEntries,
} from "@/lib/availability-admin-write";
import {
  createAvailabilityEvent,
  removeAvailabilityEvent,
} from "@/lib/googleCalendar";
import { syncGoogleCalendarAvailabilityToDatabase } from "@/lib/availability-google-sync";

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/** Admin: read month or write availability rules. */
export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "year & month (1-12) required" }, { status: 400 });
  }
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = lastDayOfMonth(year, month - 1);
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  const days = await getAdminAvailabilityMapForRange(from, to);
  return NextResponse.json({ from, to, days });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    action?: string;
    entries?: Array<{
      date: string;
      isOpen: boolean;
      note?: string | null;
      slots?: string[] | null;
    }>;
    year?: number;
    month?: number;
    isOpen?: boolean;
    until?: string;
    daysOfWeek?: number[];
    from?: string;
    to?: string;
    closeMissingInRange?: boolean;
    openSaturdays?: boolean;
  };

  if (body.action === "syncFromGoogle") {
    let fromYmd: string;
    let toYmd: string;
    if (body.year && body.month) {
      const y = body.year;
      const m = body.month;
      fromYmd = `${y}-${String(m).padStart(2, "0")}-01`;
      const last = lastDayOfMonth(y, m - 1);
      toYmd = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    } else if (
      body.from &&
      body.to &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.from) &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.to)
    ) {
      fromYmd = body.from;
      toYmd = body.to;
    } else {
      const today = getTodayInPickupTimezoneYMD();
      fromYmd = today;
      toYmd = addCalendarDaysYMD(today, 120);
    }
    const result = await syncGoogleCalendarAvailabilityToDatabase(fromYmd, toYmd, {
      closeMissingInRange: Boolean(body.closeMissingInRange),
    });
    return NextResponse.json({
      ok: result.error == null,
      imported: result.imported,
      closed: result.closed,
      error: result.error,
    });
  }

  if (body.action === "upsert" && Array.isArray(body.entries)) {
    await upsertAvailabilityEntries(body.entries);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "setDateRange") {
    const rawFrom = typeof body.from === "string" ? body.from.trim() : "";
    const rawTo = typeof body.to === "string" ? body.to.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(rawTo)) {
      return NextResponse.json(
        { error: "from and to must be calendar dates (YYYY-MM-DD)." },
        { status: 400 }
      );
    }
    let fromYmd = rawFrom;
    let toYmd = rawTo;
    if (fromYmd > toYmd) {
      const swap = fromYmd;
      fromYmd = toYmd;
      toYmd = swap;
    }
    const span = eachYmdInRangeInclusive(fromYmd, toYmd);
    if (span.length === 0) {
      return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
    }
    if (span.length > 400) {
      return NextResponse.json(
        {
          error:
            "That range is too long (max 400 days). Save a shorter span, then repeat if needed.",
        },
        { status: 400 }
      );
    }
    const isOpen = Boolean(body.isOpen);
    const noteTrim =
      typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    const note = noteTrim.length > 0 ? noteTrim : null;
    const entries = span.map((date) => ({
      date,
      isOpen,
      note,
      slots: null as string[] | null,
    }));
    await upsertAvailabilityEntries(entries);
    return NextResponse.json({
      ok: true,
      updated: span.length,
      from: fromYmd,
      to: toYmd,
    });
  }

  if (body.action === "setMonth" && body.year && body.month) {
    const y = body.year;
    const m = body.month;
    const isOpen = Boolean(body.isOpen);
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const last = lastDayOfMonth(y, m - 1);
    const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    const slotsJson = slotsToDb(undefined, isOpen);
    for (const ymd of eachYmdInRangeInclusive(from, to)) {
      await prisma.availability.upsert({
        where: { date: ymd },
        create: { date: ymd, isOpen, note: null, slots: slotsJson },
        update: {
          isOpen,
          slots: slotsJson,
          ...(isOpen ? {} : { note: null }),
        },
      });
      if (isOpen) {
        void createAvailabilityEvent(ymd, JSON.parse(slotsJson) as string[], null);
      } else {
        void removeAvailabilityEvent(ymd);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "applyFlanPickupTemplate" && body.year && body.month) {
    const y = body.year;
    const m = body.month;
    const openSaturdays = Boolean(body.openSaturdays);
    const today = getTodayInPickupTimezoneYMD();
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const last = lastDayOfMonth(y, m - 1);
    const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    const evening = eveningPickupSlots1800to2000();
    const entries: Array<{
      date: string;
      isOpen: boolean;
      note: string | null;
      slots: string[] | null;
    }> = [];
    for (const ymd of eachYmdInRangeInclusive(from, to)) {
      if (ymd < today) continue;
      const dow = ymdUtcWeekday(ymd);
      if (dow >= 1 && dow <= 4) {
        entries.push({
          date: ymd,
          isOpen: true,
          note: FLAN_ONLY_DAY_NOTE,
          slots: evening,
        });
      } else if (openSaturdays && dow === 6) {
        entries.push({
          date: ymd,
          isOpen: true,
          note: ALL_ITEMS_DAY_NOTE,
          slots: null,
        });
      }
    }
    await upsertAvailabilityEntries(entries);
    return NextResponse.json({ ok: true, applied: entries.length });
  }

  if (body.action === "applyWeekly" && Array.isArray(body.daysOfWeek)) {
    const today = getTodayInPickupTimezoneYMD();
    const end =
      body.until && /^\d{4}-\d{2}-\d{2}$/.test(body.until) && body.until >= today
        ? body.until
        : addCalendarDaysYMD(today, 60);
    const want = new Set(body.daysOfWeek.map((n) => ((n % 7) + 7) % 7));
    const slotsJson = slotsToDb(undefined, true);
    const slotsArr = JSON.parse(slotsJson) as string[];
    for (const ymd of eachYmdInRangeInclusive(today, end)) {
      if (want.has(ymdUtcWeekday(ymd))) {
        await prisma.availability.upsert({
          where: { date: ymd },
          create: { date: ymd, isOpen: true, note: null, slots: slotsJson },
          update: { isOpen: true, slots: slotsJson },
        });
        void createAvailabilityEvent(ymd, slotsArr, null);
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
