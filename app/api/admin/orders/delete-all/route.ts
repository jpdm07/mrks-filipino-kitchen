import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { updatePickupEvent } from "@/lib/googleCalendar";

const CONFIRM = "DELETE ALL ORDERS";

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const confirm =
    body &&
    typeof body === "object" &&
    "confirm" in body &&
    typeof (body as { confirm: unknown }).confirm === "string"
      ? (body as { confirm: string }).confirm.trim()
      : "";

  if (confirm !== CONFIRM) {
    return NextResponse.json(
      {
        error: `Type the exact phrase "${CONFIRM}" to confirm.`,
      },
      { status: 400 }
    );
  }

  const rows = await prisma.order.findMany({
    select: { orderNumber: true },
  });

  await prisma.order.deleteMany({});

  for (const r of rows) {
    void updatePickupEvent(r.orderNumber, "Cancelled");
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/finances");

  return NextResponse.json({ deleted: rows.length });
}
