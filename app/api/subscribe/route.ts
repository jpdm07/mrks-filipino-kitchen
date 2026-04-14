import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; name?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const name = (body.name ?? "").trim() || undefined;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You are already subscribed. Salamat!",
      });
    }

    await prisma.subscriber.create({ data: { email, name } });

    const base = getPublicSiteOrigin();
    await sendMail({
      to: email,
      subject: "You're on the list: Mr. K's Filipino Kitchen",
      html: `<p>Mabuhay${name ? `, ${name}` : ""}!</p><p>Thanks for subscribing to updates from Mr. K's Filipino Kitchen. We'll let you know when there are new dishes and specials.</p><p><a href="${base}/menu">View our menu</a></p>`,
      text: `Thanks for subscribing to Mr. K's Filipino Kitchen updates.`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
