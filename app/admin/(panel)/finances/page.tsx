import { requireAdmin } from "@/lib/admin-auth";
import { FinancesAdminClient } from "@/components/admin/FinancesAdminClient";

export default async function AdminFinancesPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[color:var(--primary)]">
        Finances
      </h1>
      <FinancesAdminClient />
    </div>
  );
}
