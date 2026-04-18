import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminManualOrderForm } from "@/components/admin/AdminManualOrderForm";

export const dynamic = "force-dynamic";

export default async function AdminManualOrderPage() {
  await requireAdmin();

  return (
    <div>
      <Link
        href="/admin/dashboard"
        className="text-sm text-[var(--primary)] underline-offset-2 hover:underline"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Record off-site order
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
        Walk-in, phone, or cash sales that did not go through the website checkout.
        Totals and tax match the same rules as online orders.
      </p>
      <div className="mt-8">
        <AdminManualOrderForm />
      </div>
    </div>
  );
}
