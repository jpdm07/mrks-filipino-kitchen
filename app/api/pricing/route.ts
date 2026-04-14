import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeDb } from "@/lib/safe-db";
import { FLAN_RETAIL_PER_RAMEKIN_USD } from "@/lib/flan-cost-model";
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
      quail: p?.sampleQuail ?? 2.49,
      flan: p?.sampleFlan ?? FLAN_RETAIL_PER_RAMEKIN_USD,
      pancit: p?.samplePancit ?? 6.3,
    };
  }, FALLBACK_SAMPLE_PRICING);

  return NextResponse.json(data);
}
