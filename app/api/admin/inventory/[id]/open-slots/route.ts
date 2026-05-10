import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { createInventoryPickupSlotsInTx } from "@/lib/inventory-pickup-slots";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const inventoryItemId = parseInt(params.id, 10);
  if (!Number.isFinite(inventoryItemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json()) as {
    datesYmd?: string[];
    startLabel?: string;
    endLabel?: string;
    maxOrders?: number;
    autoCloseWhenZero?: boolean;
  };

  const datesYmd = Array.isArray(body.datesYmd)
    ? body.datesYmd.filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];
  const startLabel = (body.startLabel ?? "").trim();
  const endLabel = (body.endLabel ?? "").trim();
  const maxOrders = Math.max(1, Math.floor(Number(body.maxOrders) || 1));
  const autoCloseWhenZero = body.autoCloseWhenZero !== false;

  if (datesYmd.length === 0 || !startLabel || !endLabel) {
    return NextResponse.json(
      {
        error:
          "Provide datesYmd (YYYY-MM-DD array), startLabel, endLabel (standard pickup labels).",
      },
      { status: 400 }
    );
  }

  const inv = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
  });
  if (!inv) {
    return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
  }
  if (!inv.isAvailable || inv.quantityInStock <= 0) {
    return NextResponse.json(
      {
        error:
          "Item must be marked available with stock before opening pickup slots.",
      },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await createInventoryPickupSlotsInTx(tx, {
        inventoryItemId,
        datesYmd,
        startLabel,
        endLabel,
        maxOrders,
        autoCloseWhenZero,
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create slots.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
