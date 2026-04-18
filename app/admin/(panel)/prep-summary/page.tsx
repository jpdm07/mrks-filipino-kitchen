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
        confirmed) for the Sun–Sat week you select. <strong>Main menu</strong>{" "}
        includes all non-dessert pickups that week; <strong>desserts &amp; flan</strong>{" "}
        use the same week (including Tue–Thu flan slots). Choose the week that
        contains your pickup date if the list looks empty. Save edits before
        printing or emailing.
      </p>
      <PrepSummaryClient initialWeekThursdayYmd={initialWeek} />
    </div>
  );
}
