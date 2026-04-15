import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { updatePickupEvent } from "@/lib/googleCalendar";

const MAX_BATCH = 500;

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

  const idsRaw = body && typeof body === "object" && "ids" in body ? (body as { ids: unknown }).ids : null;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    return NextResponse.json(
      { error: "Body must include a non-empty ids array" },
      { status: 400 }
    );
  }

  const ids = idsRaw.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  if (ids.length === 0) {
    return NextResponse.json({ error: "No valid order ids" }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `At most ${MAX_BATCH} orders per request` },
      { status: 400 }
    );
  }

  const found = await prisma.order.findMany({
    where: { id: { in: ids } },
    select: { id: true, orderNumber: true },
  });

  if (found.length === 0) {
    return NextResponse.json({ deleted: 0, orderNumbers: [] as string[] });
  }

  const foundIds = found.map((o) => o.id);
  await prisma.order.deleteMany({ where: { id: { in: foundIds } } });

  for (const o of found) {
    void updatePickupEvent(o.orderNumber, "Cancelled");
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/finances");

  return NextResponse.json({
    deleted: found.length,
    orderNumbers: found.map((o) => o.orderNumber),
  });
}
