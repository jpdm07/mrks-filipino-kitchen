import { prisma } from "@/lib/prisma";
import {
  listGoogleAvailabilityMarkers,
  removeAvailabilityEvent,
} from "@/lib/googleCalendar";
import { upsertAvailabilityEntries } from "@/lib/availability-admin-write";

/**
 * Pull all-day “available for pickup” events from Google Calendar into the
 * website database (source for checkout). Does not push back to Google.
 */
export async function syncGoogleCalendarAvailabilityToDatabase(
  fromYmd: string,
  toYmd: string,
  options?: { closeMissingInRange?: boolean }
): Promise<{
  imported: number;
  closed: number;
  error?: string;
}> {
  const markers = await listGoogleAvailabilityMarkers(fromYmd, toYmd);
  if (markers === null) {
    return {
      imported: 0,
      closed: 0,
      error:
        "Google Calendar is not configured or could not be read. Check GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_CALENDAR_ID.",
    };
  }
  const entries = markers.map((m) => ({
    date: m.date,
    isOpen: true as const,
    note: m.note,
    slots: m.slots,
  }));

  await upsertAvailabilityEntries(entries, {
    pushToGoogleCalendar: false,
  });

  let closed = 0;
  if (options?.closeMissingInRange) {
    const googleDates = new Set(markers.map((m) => m.date));
    const openRows = await prisma.availability.findMany({
      where: {
        date: { gte: fromYmd, lte: toYmd },
        isOpen: true,
      },
      select: { date: true },
    });
    for (const row of openRows) {
      if (!googleDates.has(row.date)) {
        await upsertAvailabilityEntries(
          [{ date: row.date, isOpen: false }],
          { pushToGoogleCalendar: false }
        );
        void removeAvailabilityEvent(row.date);
        closed += 1;
      }
    }
  }

  return { imported: entries.length, closed };
}
