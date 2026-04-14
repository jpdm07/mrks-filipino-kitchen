import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import {
  menuItemsToPriceSheetRows,
  syncMenuPricesToSheets,
} from "@/lib/sheets";

/** Push current DB menu unit prices to Google Sheets (Menu prices tab). */
export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.menuItem.findMany({
    orderBy: { sortOrder: "asc" },
  });
  const rows = menuItemsToPriceSheetRows(items);
  const result = await syncMenuPricesToSheets(rows);
  return NextResponse.json({
    synced: result.ok,
    reason: "reason" in result ? result.reason : undefined,
    rowCount: rows.length,
  });
}
