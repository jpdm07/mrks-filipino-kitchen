/**
 * One-time / dev helper: writes explicit Availability rows (Fri–Sun) so checkout
 * works before you use Admin → Availability. Production: use the admin calendar;
 * re-run this script anytime you want to repopulate demo open days.
 */
import { PrismaClient } from "@prisma/client";
import { addCalendarDaysYMD, getTodayInPickupTimezoneYMD } from "../lib/pickup-lead-time";
import { pickupTimeSlotLabels } from "../lib/pickup-time-slots";

const prisma = new PrismaClient();
const DEFAULT_SLOTS = JSON.stringify(pickupTimeSlotLabels());

function weekdayUtcFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

async function main() {
  const start = getTodayInPickupTimezoneYMD();
  let count = 0;
  for (let i = 0; i < 120; i++) {
    const ymd = addCalendarDaysYMD(start, i);
    const w = weekdayUtcFromYmd(ymd);
    if (w === 5 || w === 6 || w === 0) {
      await prisma.availability.upsert({
        where: { date: ymd },
        create: { date: ymd, isOpen: true, slots: DEFAULT_SLOTS },
        update: { isOpen: true, slots: DEFAULT_SLOTS },
      });
      count += 1;
    }
  }
  console.log(`Bootstrap: upserted ${count} open pickup dates (Fri/Sat/Sun, next 120 days from ${start}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
