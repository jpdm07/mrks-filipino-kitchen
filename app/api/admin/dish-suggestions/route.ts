import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.dishSuggestionSubmission.findMany({
    orderBy: { submittedAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ suggestions: rows });
}
