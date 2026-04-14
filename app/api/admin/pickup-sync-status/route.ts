import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { getGoogleAvailabilitySyncEnvSummary } from "@/lib/google-availability-stale-sync";

function dbHostFromEnv(): string | null {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.replace(/^postgresql:/i, "postgres:"));
    return u.hostname || null;
  } catch {
    return null;
  }
}

/** Admin: non-secret hints to verify the live site reads the same DB you are editing. */
export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const openDaysTotal = await prisma.availability.count({
    where: { isOpen: true },
  });
  return NextResponse.json({
    dbHost: dbHostFromEnv(),
    openDaysTotal,
    ...getGoogleAvailabilitySyncEnvSummary(),
  });
}
