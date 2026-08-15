import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { sendMail } from "@/lib/mailer";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { prisma } from "@/lib/prisma";
import {
  buildSameDaySubscriberEmailDraft,
  composeSameDaySubscriberEmailHtml,
  sameDayMailSubjectWithTimestamp,
} from "@/lib/same-day-subscriber-email";

export const maxDuration = 60;

type Body = {
  action?: "preview" | "send";
  introMessage?: string;
  subject?: string;
};

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action === "send" ? "send" : "preview";
  const draft = await buildSameDaySubscriberEmailDraft(
    body.introMessage,
    body.subject
  );
  if (!draft.ok) {
    return NextResponse.json({ error: draft.error }, { status: 400 });
  }

  if (action === "preview") {
    return NextResponse.json({
      subject: draft.subject,
      introMessage: draft.introMessage,
      html: draft.html,
      text: draft.text,
      itemCount: draft.items.length,
      items: draft.items.map((item) => ({
        inventoryId: item.inventoryId,
        displayName: item.displayName,
        pickupWindowLabel: item.pickupWindowLabel,
        availabilityLine: item.availabilityLine,
      })),
      subscriberCount: draft.subscriberCount,
      todayYmd: draft.todayYmd,
      orderUrl: draft.orderUrl,
    });
  }

  if (draft.subscriberCount === 0) {
    return NextResponse.json(
      { error: "No subscribers on the list yet." },
      { status: 400 }
    );
  }

  const base = getPublicSiteOrigin();
  const mailSubject = sameDayMailSubjectWithTimestamp(draft.subject);
  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  const subs = await prisma.subscriber.findMany();
  for (const s of subs) {
    const unsub = `${base}/api/unsubscribe?email=${encodeURIComponent(s.email)}`;
    const html = composeSameDaySubscriberEmailHtml({
      introMessage: draft.introMessage,
      items: draft.items,
      unsubscribeUrl: unsub,
    });
    const r = await sendMail({
      to: s.email,
      subject: mailSubject,
      html,
      text: draft.text,
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
    itemCount: draft.items.length,
    subject: mailSubject,
    ...(lastError && failed > 0 ? { lastError } : {}),
  });
}
