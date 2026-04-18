import { ConfirmedRevenueTaxClient } from "@/components/admin/ConfirmedRevenueTaxClient";
import { requireAdmin } from "@/lib/admin-auth";
import { TaxDocumentationClient } from "@/components/admin/TaxDocumentationClient";

export const dynamic = "force-dynamic";

export default async function TaxDocumentationPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0038A8]">
        Tax documentation
      </h1>
      <ConfirmedRevenueTaxClient />
      <TaxDocumentationClient />
    </div>
  );
}
