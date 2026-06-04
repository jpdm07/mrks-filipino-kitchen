import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import {
  deleteInventoryPickupSlotInTx,
  slotWindowFromLabelsJson,
  updateInventoryPickupSlotInTx,
} from "@/lib/inventory-pickup-slots";

function parseIds(params: { id: string; slotId: string }) {
  const inventoryItemId = parseInt(params.id, 10);
  const slotId = parseInt(params.slotId, 10);
  if (!Number.isFinite(inventoryItemId) || !Number.isFinite(slotId)) {
    return null;
  }
  return { inventoryItemId, slotId };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; slotId: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ids = parseIds(params);
  if (!ids) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json()) as {
    dateYmd?: string;
    startLabel?: string;
    endLabel?: string;
    maxOrders?: number;
    autoCloseWhenZero?: boolean;
    closed?: boolean;
  };

  const dateYmd = (body.dateYmd ?? "").trim();
  const startLabel = (body.startLabel ?? "").trim();
  const endLabel = (body.endLabel ?? "").trim();
  if (!dateYmd || !startLabel || !endLabel) {
    return NextResponse.json(
      { error: "dateYmd, startLabel, and endLabel are required." },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await updateInventoryPickupSlotInTx(tx, {
        slotId: ids.slotId,
        inventoryItemId: ids.inventoryItemId,
        dateYmd,
        startLabel,
        endLabel,
        maxOrders: Math.max(1, Math.floor(Number(body.maxOrders) || 1)),
        autoCloseWhenZero: body.autoCloseWhenZero !== false,
        closed: body.closed === true,
      });
    });

    const updated = await prisma.inventoryPickupSlot.findUniqueOrThrow({
      where: { id: ids.slotId },
    });
    const window = slotWindowFromLabelsJson(updated.slotLabelsJson);

    return NextResponse.json({
      ok: true,
      slot: {
        id: updated.id,
        dateYmd: updated.dateYmd,
        startLabel: window?.startLabel ?? startLabel,
        endLabel: window?.endLabel ?? endLabel,
        maxOrders: updated.maxOrders,
        ordersFilled: updated.ordersFilled,
        autoCloseWhenZero: updated.autoCloseWhenZero,
        closed: updated.closed,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update slot.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; slotId: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ids = parseIds(params);
  if (!ids) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await deleteInventoryPickupSlotInTx(
        tx,
        ids.slotId,
        ids.inventoryItemId
      );
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not delete slot.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
