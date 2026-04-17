import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
import {
  buildCustomerReplyFooterHtml,
  buildCustomerReplyFooterPlainText,
} from "@/lib/mail-reply-routing";
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
    const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;background:#FFFDF5;padding:20px 12px;font-family:Georgia,serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
<tr><td style="padding:0;">${buildEmailBrandBannerHtml()}</td></tr>
<tr><td style="padding:24px 22px;background:#fff;border:1px solid #e8e8e8;border-top:0;border-radius:0 0 12px 12px;font-size:16px;line-height:1.55;">
<p style="margin:0 0 12px;">Mabuhay${name ? `, ${name}` : ""}!</p>
<p style="margin:0 0 12px;">Thanks for subscribing to updates from Mr. K's Filipino Kitchen. We'll let you know when there are new dishes and specials.</p>
<p style="margin:0;"><a href="${base}/menu" style="color:#0038A8;font-weight:600;">View our menu</a></p>
${buildCustomerReplyFooterHtml()}
</td></tr></table>
</td></tr></table>
</body></html>`;

    const welcome = await sendMail({
      to: email,
      subject: "You're on the list: Mr. K's Filipino Kitchen",
      html: welcomeHtml,
      text: `Thanks for subscribing to Mr. K's Filipino Kitchen updates.${buildCustomerReplyFooterPlainText()}`,
    });
    if (!welcome.ok) {
      console.warn("[subscribe] Welcome email failed:", welcome.error);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
