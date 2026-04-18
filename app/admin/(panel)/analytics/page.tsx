import { AnalyticsSalesClient } from "@/components/admin/AnalyticsSalesClient";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl pb-12">
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0038A8]">
        Sales analytics
      </h1>
      <p className="mt-2 text-base text-[var(--text-muted)]">
        Insights from <strong>confirmed</strong>, non-demo orders only. Sample lines are excluded.
      </p>
      <AnalyticsSalesClient />
    </div>
  );
}
