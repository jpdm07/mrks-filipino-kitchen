import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { upsertAvailabilityEntries } from "@/lib/availability-admin-write";

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    entries?: Array<{
      date: string;
      isOpen: boolean;
      note?: string | null;
      slots?: string[] | null;
    }>;
  };
  if (!Array.isArray(body.entries)) {
    return NextResponse.json({ error: "entries[] required" }, { status: 400 });
  }
  await upsertAvailabilityEntries(body.entries);
  return NextResponse.json({ ok: true });
}
