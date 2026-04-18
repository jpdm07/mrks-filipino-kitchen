import { requireAdmin } from "@/lib/admin-auth";
import { PrepSummaryClient } from "@/components/admin/PrepSummaryClient";
import {
  getThursdayYmdOfSameWeek,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";

export const dynamic = "force-dynamic";

export default async function PrepSummaryPage() {
  await requireAdmin();
  const initialWeek = getThursdayYmdOfSameWeek(getTodayInPickupTimezoneYMD());

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--primary)]">
        Weekly prep summary
      </h1>
      <p className="text-base text-[var(--text-muted)]">
        Totals from active orders (pending verification, awaiting payment, or
        confirmed) for the pickup week. Main menu counts are <strong>Fri/Sat</strong>{" "}
        only; desserts and flan include <strong>the full Sun–Sat week</strong>{" "}
        (e.g. weekday flan pickups). Save edits before printing or emailing.
      </p>
      <PrepSummaryClient initialWeekThursdayYmd={initialWeek} />
    </div>
  );
}
