import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.inventoryItem.findMany({
    orderBy: { id: "asc" },
    include: {
      deductionLogs: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  return NextResponse.json({
    items: rows.map((r) => ({
      ...JSON.parse(JSON.stringify(r)),
      deductionLogs: r.deductionLogs.map((l) => ({
        ...JSON.parse(JSON.stringify(l)),
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    itemName?: string;
    unitLabel?: string;
    menuItemId?: string | null;
  };
  const itemName = (body.itemName ?? "").trim();
  const unitLabel = (body.unitLabel ?? "").trim();
  if (!itemName || !unitLabel) {
    return NextResponse.json(
      { error: "itemName and unitLabel are required." },
      { status: 400 }
    );
  }
  const menuItemId =
    typeof body.menuItemId === "string" && body.menuItemId.trim()
      ? body.menuItemId.trim()
      : null;

  const row = await prisma.inventoryItem.create({
    data: {
      itemName,
      unitLabel,
      menuItemId,
      quantityInStock: 0,
      isAvailable: false,
      showBanner: false,
    },
    include: {
      deductionLogs: { take: 0 },
    },
  });
  return NextResponse.json(JSON.parse(JSON.stringify(row)));
}
