/**
 * One-time / ops: for the current calendar month (America/Chicago), reset pickup
 * availability to a biweekly pattern:
 *   - First open day = today + MIN_LEAD_DAYS (4-day prep).
 *   - Further open days = that date + 14 days, + 28, … while still in the month.
 * All other days in that month are closed (rows removed). Other months untouched.
 *
 * Run: npx tsx scripts/set-current-month-biweekly-availability.ts
 * Requires DATABASE_URL (e.g. from .env via dotenv).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
} from "../lib/pickup-lead-time";
import { ORDER_FULFILLMENT } from "../lib/config";
import { pickupTimeSlotLabels } from "../lib/pickup-time-slots";

const prisma = new PrismaClient();
const DEFAULT_SLOTS = JSON.stringify(pickupTimeSlotLabels());

function firstDayOfMonthYmd(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function lastDayOfMonthYmd(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  const firstNext =
    m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return addCalendarDaysYMD(firstNext, -1);
}

function collectOpenDatesThisMonth(
  todayYmd: string,
  minLeadDays: number
): { monthStart: string; monthEnd: string; openDates: string[] } {
  const monthStart = firstDayOfMonthYmd(todayYmd);
  const monthEnd = lastDayOfMonthYmd(todayYmd);
  const firstPickup = addCalendarDaysYMD(todayYmd, minLeadDays);
  const openDates: string[] = [];
  let d = firstPickup;
  while (d <= monthEnd) {
    if (d >= monthStart) openDates.push(d);
    d = addCalendarDaysYMD(d, 14);
  }
  return { monthStart, monthEnd, openDates };
}

async function main() {
  const today = getTodayInPickupTimezoneYMD();
  const lead = ORDER_FULFILLMENT.MIN_LEAD_DAYS;
  const { monthStart, monthEnd, openDates } = collectOpenDatesThisMonth(
    today,
    lead
  );

  const del = await prisma.availability.deleteMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
  });

  for (const date of openDates) {
    await prisma.availability.create({
      data: {
        date,
        isOpen: true,
        slots: DEFAULT_SLOTS,
        note: `Biweekly slot (${monthStart.slice(0, 7)} schedule; +${lead}d lead, then every 14d).`,
      },
    });
  }

  console.log(
    `Today (pickup TZ): ${today} · Month ${monthStart} … ${monthEnd} · ` +
      `Removed ${del.count} row(s) in range · Open pickup day(s): ` +
      (openDates.length ? openDates.join(", ") : "(none — first bookable is after this month)")
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
