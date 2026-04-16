import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { PricingClient } from "@/components/admin/PricingClient";
import { FALLBACK_SAMPLE_PRICING } from "@/lib/static-menu-fallback";
export default async function PricingPage() {
  await requireAdmin();
  const p = await prisma.pricingSettings.findUnique({ where: { id: "default" } });
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Pricing: Samples
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Adjust sample pack prices shown in the customer cart.
      </p>
      <PricingClient
        initial={{
          sampleQuail: p?.sampleQuail ?? FALLBACK_SAMPLE_PRICING.quail,
          sampleFlan: p?.sampleFlan ?? FALLBACK_SAMPLE_PRICING.flan,
          samplePancit: p?.samplePancit ?? FALLBACK_SAMPLE_PRICING.pancit,
        }}
      />
    </div>
  );
}
