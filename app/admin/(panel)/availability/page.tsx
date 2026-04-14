import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminAvailabilityPanel } from "@/components/admin/AdminAvailabilityPanel";

export default async function AdminAvailabilityPage() {
  await requireAdmin();
  return (
    <div>
      <p className="mb-4">
        <Link
          href="/admin/dashboard"
          className="text-sm font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </p>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Pickup availability
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
        Mark which calendar dates customers may choose for pickup. The storefront
        still enforces about 3–4 days lead time (earliest selectable date)
        regardless of these settings. Saves go to
        the same database the live site uses — the public pickup calendar and
        checkout calendar refresh automatically every few seconds (and when
        someone returns to your site tab).
      </p>
      <div className="mt-8">
        <AdminAvailabilityPanel />
      </div>
    </div>
  );
}
