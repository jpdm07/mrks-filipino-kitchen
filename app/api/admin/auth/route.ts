import { NextRequest, NextResponse } from "next/server";
import {
  setAdminCookie,
  clearAdminCookie,
  isAdminSession,
  verifyAdminToken,
  getAdminTokenFromRequest,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    username?: string;
    password?: string;
  };
  const u = process.env.ADMIN_USERNAME ?? "";
  const p = process.env.ADMIN_PASSWORD ?? "";
  if (!u || !p) {
    return NextResponse.json(
      { error: "Admin not configured" },
      { status: 500 }
    );
  }
  if (body.username === u && body.password === p) {
    await setAdminCookie();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const header = req.headers.get("cookie");
  const token = getAdminTokenFromRequest(header);
  if (verifyAdminToken(token)) {
    return NextResponse.json({ ok: true });
  }
  const ok = await isAdminSession();
  return NextResponse.json({ ok });
}
