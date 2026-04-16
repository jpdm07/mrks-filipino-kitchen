import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeDb } from "@/lib/safe-db";
import { LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN } from "@/lib/lumpia-cost-model";
import { FALLBACK_SAMPLE_PRICING } from "@/lib/static-menu-fallback";

export async function GET() {
  const data = await safeDb(async () => {
    const p = await prisma.pricingSettings.findUnique({
      where: { id: "default" },
    });
    return {
      /** Always tied to menu dozen prices per protein (beef vs pork/turkey). */
      lumpia: { ...LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN },
      quail: p?.sampleQuail ?? FALLBACK_SAMPLE_PRICING.quail,
      flan: p?.sampleFlan ?? FALLBACK_SAMPLE_PRICING.flan,
      pancit: p?.samplePancit ?? FALLBACK_SAMPLE_PRICING.pancit,
    };
  }, FALLBACK_SAMPLE_PRICING);

  return NextResponse.json(data);
}
