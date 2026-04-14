import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { sendMail, newsletterHtml } from "@/lib/mailer";
import { parseMenuSizes } from "@/lib/menu-types";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    subject?: string;
    message?: string;
    itemId?: string;
  };
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();
  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and message required" },
      { status: 400 }
    );
  }

  let itemBlock = "";
  if (body.itemId) {
    const item = await prisma.menuItem.findUnique({
      where: { id: body.itemId },
    });
    if (item) {
      const sizes = parseMenuSizes(item.sizes);
      const price =
        sizes[0]?.price != null
          ? `$${sizes[0].price.toFixed(2)}`
          : `$${item.basePrice.toFixed(2)}`;
      itemBlock = `<div style="margin-bottom:24px;"><img src="${item.photoUrl}" alt="" width="100%" style="max-width:560px;border-radius:12px;display:block"/><h2 style="color:#0038A8;margin:16px 0 8px;">${item.name}</h2><p style="margin:0 0 8px;">${item.description}</p><p style="font-weight:bold;color:#CE1126;">From ${price}</p></div>`;
    }
  }

  const subs = await prisma.subscriber.findMany();
  const base = getPublicSiteOrigin();
  let sent = 0;
  for (const s of subs) {
    const unsub = `${base}/api/unsubscribe?email=${encodeURIComponent(s.email)}`;
    const html = newsletterHtml({
      message: message.replace(/\n/g, "<br/>"),
      itemBlock,
      unsubscribeUrl: unsub,
    });
    const ok = await sendMail({
      to: s.email,
      subject,
      html,
      text: message,
    });
    if (ok) sent++;
  }

  return NextResponse.json({ sent, total: subs.length });
}
