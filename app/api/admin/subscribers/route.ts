import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const subscribers = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ subscribers });
}
