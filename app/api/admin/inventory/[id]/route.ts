import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { applyInventoryStockRulesInTx } from "@/lib/inventory-stock-rules";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json()) as {
    quantityInStock?: number;
    isAvailable?: boolean;
    showBanner?: boolean;
    bannerMessage?: string | null;
    lowStockThreshold?: number | null;
    itemName?: string;
    unitLabel?: string;
    menuItemId?: string | null;
  };

  const qty =
    body.quantityInStock !== undefined
      ? Math.max(0, Math.floor(Number(body.quantityInStock)))
      : undefined;

  const data: Record<string, unknown> = {};
  if (body.itemName !== undefined) data.itemName = String(body.itemName).trim();
  if (body.unitLabel !== undefined) data.unitLabel = String(body.unitLabel).trim();
  if (body.menuItemId !== undefined) {
    data.menuItemId =
      typeof body.menuItemId === "string" && body.menuItemId.trim()
        ? body.menuItemId.trim()
        : null;
  }
  if (qty !== undefined) {
    data.quantityInStock = qty;
    if (qty <= 0) {
      data.isAvailable = false;
      data.showBanner = false;
    }
  }
  if (body.isAvailable !== undefined) data.isAvailable = Boolean(body.isAvailable);
  if (body.showBanner !== undefined) data.showBanner = Boolean(body.showBanner);
  if (body.bannerMessage !== undefined) {
    const m = body.bannerMessage;
    data.bannerMessage =
      typeof m === "string" && m.trim() ? m.trim() : null;
  }
  if (body.lowStockThreshold !== undefined) {
    const t = body.lowStockThreshold;
    data.lowStockThreshold =
      t === null || t === ""
        ? null
        : Math.max(0, Math.floor(Number(t)));
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id },
        data: data as object,
      });
      await applyInventoryStockRulesInTx(tx, id);
      return tx.inventoryItem.findUniqueOrThrow({
        where: { id },
        include: {
          deductionLogs: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      });
    });
    return NextResponse.json(JSON.parse(JSON.stringify(updated)));
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}
