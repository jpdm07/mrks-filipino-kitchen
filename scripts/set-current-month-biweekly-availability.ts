/**
 * One-time / ops: for the current calendar month (America/Chicago), reset pickup
 * availability to a biweekly pattern:
 *   - First open day = same rule as checkout (first Fri/Sat on or after today + 7d).
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
  getEarliestPickupDateMinYMD,
  getTodayInPickupTimezoneYMD,
} from "../lib/pickup-lead-time";
import { pickupTimeSlotLabels } from "../lib/pickup-time-slots";
import { createAvailabilityEvent } from "../lib/googleCalendar";

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
  monthStart: string,
  monthEnd: string,
  firstOpenYmd: string
): string[] {
  const openDates: string[] = [];
  let d = firstOpenYmd;
  while (d <= monthEnd) {
    if (d >= monthStart) openDates.push(d);
    d = addCalendarDaysYMD(d, 14);
  }
  return openDates;
}

async function main() {
  const today = getTodayInPickupTimezoneYMD();
  const earliest = getEarliestPickupDateMinYMD();
  const monthStart = firstDayOfMonthYmd(today);
  const monthEnd = lastDayOfMonthYmd(today);
  const openDates = collectOpenDatesThisMonth(monthStart, monthEnd, earliest);

  const del = await prisma.availability.deleteMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
  });

  const slotsArr = pickupTimeSlotLabels();
  const note = `Biweekly slot (${monthStart.slice(0, 7)}; first open ${earliest}, then every 14d).`;
  for (const date of openDates) {
    await prisma.availability.create({
      data: {
        date,
        isOpen: true,
        slots: DEFAULT_SLOTS,
        note,
      },
    });
    void createAvailabilityEvent(date, slotsArr, note);
  }

  console.log(
    `Today (pickup TZ): ${today} · Earliest bookable: ${earliest} · Month ${monthStart} … ${monthEnd} · ` +
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
