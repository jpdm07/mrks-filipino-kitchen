import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { applyInventoryStockRulesInTx } from "@/lib/inventory-stock-rules";
import {
  INVENTORY_DEDUCTION_ORDER_LINE_QTY,
  isValidDeductionMode,
  normalizeInventoryDeductionMode,
} from "@/lib/inventory-deduction-modes";
import {
  isValidInventoryLineCookFilter,
  normalizeInventoryLineCookFilter,
} from "@/lib/inventory-line-cook-filter";

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
  type Row = (typeof rows)[number];
  return NextResponse.json({
    items: rows.map((r: Row) => ({
      ...JSON.parse(JSON.stringify(r)),
      deductionLogs: r.deductionLogs.map((l: Row["deductionLogs"][number]) => ({
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
    quantityInStock?: number;
    isAvailable?: boolean;
    showBanner?: boolean;
    bannerMessage?: string | null;
    lowStockThreshold?: number | null;
    deductionMode?: string;
    lineCookFilter?: string;
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

  let qty = Math.max(0, Math.floor(Number(body.quantityInStock ?? 0)));
  let isAvailable =
    body.isAvailable !== undefined ? Boolean(body.isAvailable) : false;
  let showBanner =
    body.showBanner !== undefined ? Boolean(body.showBanner) : false;
  if (qty <= 0) {
    isAvailable = false;
    showBanner = false;
  }

  const bannerMessage =
    typeof body.bannerMessage === "string" && body.bannerMessage.trim()
      ? body.bannerMessage.trim()
      : null;
  const lowStockThreshold =
    body.lowStockThreshold === null || body.lowStockThreshold === undefined
      ? null
      : Math.max(0, Math.floor(Number(body.lowStockThreshold)));

  let deductionMode = INVENTORY_DEDUCTION_ORDER_LINE_QTY;
  if (body.deductionMode !== undefined) {
    const m = String(body.deductionMode).trim();
    if (!isValidDeductionMode(m)) {
      return NextResponse.json({ error: "Invalid deductionMode" }, { status: 400 });
    }
    deductionMode = normalizeInventoryDeductionMode(m);
  }

  let lineCookFilter = normalizeInventoryLineCookFilter("any");
  if (body.lineCookFilter !== undefined) {
    const m = String(body.lineCookFilter).trim().toLowerCase();
    if (!isValidInventoryLineCookFilter(m)) {
      return NextResponse.json({ error: "Invalid lineCookFilter" }, { status: 400 });
    }
    lineCookFilter = normalizeInventoryLineCookFilter(m);
  }

  try {
    const row = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.inventoryItem.create({
        data: {
          itemName,
          unitLabel,
          menuItemId,
          quantityInStock: qty,
          isAvailable,
          showBanner,
          bannerMessage,
          lowStockThreshold,
          deductionMode,
          lineCookFilter,
        },
      });
      await applyInventoryStockRulesInTx(tx, created.id);
      return tx.inventoryItem.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          deductionLogs: { take: 0 },
        },
      });
    });
    return NextResponse.json(JSON.parse(JSON.stringify(row)));
  } catch (e) {
    console.error("[admin inventory POST]", e);
    const detail =
      e instanceof Error ? e.message : "Unknown error (check DB migration / logs).";
    return NextResponse.json({ error: `Create failed: ${detail}` }, { status: 400 });
  }
}
