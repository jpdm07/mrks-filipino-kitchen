import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  adminSessionClearCookieSettings,
  adminSessionCookieSettings,
  isAdminSession,
  newAdminSessionToken,
  verifyAdminToken,
  getAdminTokenFromRequest,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    username?: string;
    password?: string;
  };
  const u = (process.env.ADMIN_USERNAME ?? "").trim();
  const p = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!u || !p) {
    return NextResponse.json(
      { error: "Admin not configured" },
      { status: 500 }
    );
  }
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (username === u && password === p) {
    // Set cookie on the response object — `cookies().set()` in Route Handlers
    // does not always attach Set-Cookie to the outgoing response on Vercel.
    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      ADMIN_COOKIE_NAME,
      newAdminSessionToken(),
      adminSessionCookieSettings()
    );
    return res;
  }
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", adminSessionClearCookieSettings());
  return res;
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
