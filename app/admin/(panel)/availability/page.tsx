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
        Mark which calendar dates customers may choose for pickup.{" "}
        <strong>Mon–Thu</strong> are normally dessert-only online; if you
        double-click a day to open it and save slots, checkout offers that date
        for <strong>any items</strong> (lumpia, pancit, flan, etc.). Fri/Sat
        follow the usual weekend rules (Thu noon cutoff for the current weekend).
        Saves go to the same database the live site uses — checkout refreshes
        every few seconds.
      </p>
      <div className="mt-8">
        <AdminAvailabilityPanel />
      </div>
    </div>
  );
}
