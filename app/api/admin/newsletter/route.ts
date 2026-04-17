import type { MenuItem } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { sendMail, newsletterHtml } from "@/lib/mailer";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import {
  buildNewsletterSpotlightHtml,
  buildNewsletterSpotlightPlainText,
} from "@/lib/newsletter-spotlight-html";

/** Allow time to send many sequential emails (plan may cap lower on Hobby). */
export const maxDuration = 60;

function uniqueOrderedIds(itemId: string | undefined, itemIds: string[] | undefined): string[] {
  const raw = [...(itemIds ?? []), ...(itemId ? [itemId] : [])]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of raw) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    subject?: string;
    message?: string;
    itemId?: string;
    itemIds?: string[];
  };
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();
  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and message required" },
      { status: 400 }
    );
  }

  const ids = uniqueOrderedIds(body.itemId, body.itemIds);
  let itemBlock = "";
  let spotlightItems: MenuItem[] = [];
  if (ids.length > 0) {
    const rows = await prisma.menuItem.findMany({
      where: { id: { in: ids } },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    spotlightItems = ids.map((id) => byId.get(id)).filter(Boolean) as typeof rows;
    itemBlock = buildNewsletterSpotlightHtml(spotlightItems);
  }

  const subs = await prisma.subscriber.findMany();
  const base = getPublicSiteOrigin();
  const spotlightText = buildNewsletterSpotlightPlainText(spotlightItems);
  const textBody = spotlightText ? `${message}\n\n${spotlightText}\nOrder: ${base}/menu` : message;

  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (const s of subs) {
    const unsub = `${base}/api/unsubscribe?email=${encodeURIComponent(s.email)}`;
    const html = newsletterHtml({
      message: message.replace(/\n/g, "<br/>"),
      itemBlock: itemBlock || undefined,
      unsubscribeUrl: unsub,
    });
    const r = await sendMail({
      to: s.email,
      subject,
      html,
      text: textBody,
    });
    if (r.ok) sent++;
    else {
      failed++;
      lastError = r.error;
    }
  }

  return NextResponse.json({
    sent,
    failed,
    total: subs.length,
    featuredCount: spotlightItems.length,
    ...(lastError && failed > 0 ? { lastError } : {}),
  });
}
