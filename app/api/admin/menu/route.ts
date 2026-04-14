import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import {
  menuItemsToPriceSheetRows,
  syncMenuPricesToSheets,
} from "@/lib/sheets";

async function pushMenuPricesToSheetsFireAndForget() {
  try {
    const items = await prisma.menuItem.findMany({
      orderBy: { sortOrder: "asc" },
    });
    await syncMenuPricesToSheets(menuItemsToPriceSheetRows(items));
  } catch {
    /* non-fatal */
  }
}

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.menuItem.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    category?: string;
    calories?: string;
    basePrice?: number;
    sizes?: unknown;
    photoUrl?: string;
    isActive?: boolean;
    hasCooked?: boolean;
    hasFrozen?: boolean;
    sortOrder?: number;
    variantGroup?: string | null;
    variantShortLabel?: string | null;
    groupCardTitle?: string | null;
    groupServingBlurb?: string | null;
  };
  const sizesStr =
    typeof body.sizes === "string"
      ? body.sizes
      : JSON.stringify(body.sizes ?? []);
  const nz = (s: string | null | undefined) => {
    const t = typeof s === "string" ? s.trim() : "";
    return t.length ? t : null;
  };
  const item = await prisma.menuItem.create({
    data: {
      name: body.name ?? "New item",
      description: body.description ?? "",
      category: body.category ?? "Meals",
      calories: body.calories ?? "",
      basePrice: body.basePrice ?? 0,
      sizes: sizesStr,
      photoUrl: body.photoUrl ?? "",
      isActive: body.isActive ?? true,
      hasCooked: body.hasCooked ?? false,
      hasFrozen: body.hasFrozen ?? false,
      sortOrder: body.sortOrder ?? 999,
      variantGroup: nz(body.variantGroup),
      variantShortLabel: nz(body.variantShortLabel),
      groupCardTitle: nz(body.groupCardTitle),
      groupServingBlurb: nz(body.groupServingBlurb),
    },
  });
  void pushMenuPricesToSheetsFireAndForget();
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { id?: string } & Record<string, unknown>;
  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const data: Record<string, unknown> = { ...body };
  delete data.id;
  if (data.sizes != null && typeof data.sizes !== "string") {
    data.sizes = JSON.stringify(data.sizes);
  }
  const item = await prisma.menuItem.update({
    where: { id },
    data: data as object,
  });
  void pushMenuPricesToSheetsFireAndForget();
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await prisma.menuItem.delete({ where: { id } });
  void pushMenuPricesToSheetsFireAndForget();
  return NextResponse.json({ ok: true });
}
