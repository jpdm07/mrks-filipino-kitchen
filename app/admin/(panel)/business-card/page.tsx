import { requireAdmin } from "@/lib/admin-auth";
import { BusinessCardSheet } from "@/components/business-card/BusinessCardSheet";

export default async function AdminBusinessCardPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold print:hidden">
        Business card
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)] print:hidden">
        Same as public{" "}
        <a href="/business-card" className="font-semibold text-[var(--primary)] underline">
          /business-card
        </a>
        : one preview on screen; print outputs eight 3.5&quot;×2&quot; cards on US Letter.
      </p>
      <BusinessCardSheet />
    </div>
  );
}
