import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [settings, qualifyingSameDayCount] = await Promise.all([
    prisma.pricingSettings.findUnique({ where: { id: "default" } }),
    prisma.inventoryItem.count({
      where: {
        showBanner: true,
        isAvailable: true,
        quantityInStock: { gt: 0 },
      },
    }),
  ]);
  const schedulingBannerForceStateA =
    settings?.schedulingBannerForceStateA === true;
  const effectiveState =
    !schedulingBannerForceStateA && qualifyingSameDayCount > 0 ? "B" : "A";
  return NextResponse.json({
    schedulingBannerForceStateA,
    qualifyingSameDayCount,
    effectiveState,
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { schedulingBannerForceStateA?: boolean };
  if (typeof body.schedulingBannerForceStateA !== "boolean") {
    return NextResponse.json(
      { error: "schedulingBannerForceStateA boolean required" },
      { status: 400 }
    );
  }
  const p = await prisma.pricingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      schedulingBannerForceStateA: body.schedulingBannerForceStateA,
    },
    update: { schedulingBannerForceStateA: body.schedulingBannerForceStateA },
  });
  const qualifyingSameDayCount = await prisma.inventoryItem.count({
    where: {
      showBanner: true,
      isAvailable: true,
      quantityInStock: { gt: 0 },
    },
  });
  const effectiveState =
    !p.schedulingBannerForceStateA && qualifyingSameDayCount > 0 ? "B" : "A";
  return NextResponse.json({
    schedulingBannerForceStateA: p.schedulingBannerForceStateA,
    qualifyingSameDayCount,
    effectiveState,
  });
}
