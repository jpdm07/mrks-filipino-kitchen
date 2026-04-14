import { requireAdmin } from "@/lib/admin-auth";
import { AdminAvailabilityPanel } from "@/components/admin/AdminAvailabilityPanel";

export default async function AdminAvailabilityPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Pickup availability
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
        Mark which calendar dates customers may choose for pickup. Customers also
        have a minimum 4-day lead time regardless of these settings.
      </p>
      <div className="mt-8">
        <AdminAvailabilityPanel />
      </div>
    </div>
  );
}
