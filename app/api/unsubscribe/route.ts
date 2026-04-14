import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (email) {
    await prisma.subscriber.deleteMany({ where: { email } });
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Unsubscribed</title></head><body style="font-family:system-ui;padding:40px;background:#FFFDF5;color:#1A1A1A;"><h1>You're unsubscribed</h1><p>You won't receive further newsletter emails from Mr. K's Filipino Kitchen.</p><p><a href="/">Back to site</a></p></body></html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
