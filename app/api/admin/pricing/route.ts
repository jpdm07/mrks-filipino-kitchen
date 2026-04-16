import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { LUMPIA_SAMPLE_4PC_RETAIL_USD } from "@/lib/lumpia-cost-model";
import { FALLBACK_SAMPLE_PRICING } from "@/lib/static-menu-fallback";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const p = await prisma.pricingSettings.findUnique({
    where: { id: "default" },
  });
  return NextResponse.json(
    p ?? {
      sampleLumpia: LUMPIA_SAMPLE_4PC_RETAIL_USD,
      sampleQuail: FALLBACK_SAMPLE_PRICING.quail,
      sampleFlan: FALLBACK_SAMPLE_PRICING.flan,
      samplePancit: FALLBACK_SAMPLE_PRICING.pancit,
    }
  );
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    sampleQuail?: number;
    sampleFlan?: number;
    samplePancit?: number;
  };
  const p = await prisma.pricingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      sampleLumpia: LUMPIA_SAMPLE_4PC_RETAIL_USD,
      sampleQuail: body.sampleQuail ?? FALLBACK_SAMPLE_PRICING.quail,
      sampleFlan: body.sampleFlan ?? FALLBACK_SAMPLE_PRICING.flan,
      samplePancit: body.samplePancit ?? FALLBACK_SAMPLE_PRICING.pancit,
    },
    update: {
      ...(body.sampleQuail != null ? { sampleQuail: body.sampleQuail } : {}),
      ...(body.sampleFlan != null ? { sampleFlan: body.sampleFlan } : {}),
      ...(body.samplePancit != null ? { samplePancit: body.samplePancit } : {}),
    },
  });
  return NextResponse.json(p);
}
