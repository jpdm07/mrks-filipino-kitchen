import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { FLAN_RETAIL_PER_RAMEKIN_USD } from "@/lib/flan-cost-model";
import { LUMPIA_SAMPLE_4PC_RETAIL_USD } from "@/lib/lumpia-cost-model";

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
      sampleQuail: 2.49,
      sampleFlan: FLAN_RETAIL_PER_RAMEKIN_USD,
      samplePancit: 6.3,
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
      sampleQuail: body.sampleQuail ?? 2.49,
      sampleFlan: body.sampleFlan ?? FLAN_RETAIL_PER_RAMEKIN_USD,
      samplePancit: body.samplePancit ?? 6.3,
    },
    update: {
      ...(body.sampleQuail != null ? { sampleQuail: body.sampleQuail } : {}),
      ...(body.sampleFlan != null ? { sampleFlan: body.sampleFlan } : {}),
      ...(body.samplePancit != null ? { samplePancit: body.samplePancit } : {}),
    },
  });
  return NextResponse.json(p);
}
