import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * One canonical host for SEO and printed QR/links: https://mrkskitchen.com (no www).
 * Vercel already upgrades HTTP→HTTPS; this handles www → apex.
 */
export function middleware(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host") ??
    "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  if (hostname === "www.mrkskitchen.com") {
    const url = request.nextUrl.clone();
    url.hostname = "mrkskitchen.com";
    url.port = "";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
