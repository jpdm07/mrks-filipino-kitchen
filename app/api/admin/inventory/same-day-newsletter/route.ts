import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { sendMail } from "@/lib/mailer";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import {
  parseNewsletterAudience,
  resolveNewsletterRecipients,
} from "@/lib/admin-subscriber-recipients";
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
  closingMessage?: string;
  audience?: "all" | "selected";
  subscriberIds?: string[];
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
    body.subject,
    body.closingMessage
  );
  if (!draft.ok) {
    return NextResponse.json({ error: draft.error }, { status: 400 });
  }

  if (action === "preview") {
    return NextResponse.json({
      subject: draft.subject,
      introMessage: draft.introMessage,
      closingMessage: draft.closingMessage,
      html: draft.html,
      text: draft.text,
      itemCount: draft.items.length,
      items: draft.items.map((item) => ({
        inventoryId: item.inventoryId,
        displayName: item.displayName,
        pickupWindowLabel: item.pickupWindowLabel,
        pickupDateLabel: item.pickupDateLabel,
        availabilityLine: item.availabilityLine,
      })),
      subscriberCount: draft.subscriberCount,
      todayYmd: draft.todayYmd,
      orderUrl: draft.orderUrl,
    });
  }

  const audience = parseNewsletterAudience(body.audience);
  if (!audience) {
    return NextResponse.json(
      { error: "Choose selected subscribers or the full list." },
      { status: 400 }
    );
  }

  const recipients = await resolveNewsletterRecipients({
    audience,
    subscriberIds: body.subscriberIds,
  });
  if (!recipients.ok) {
    return NextResponse.json({ error: recipients.error }, { status: 400 });
  }

  const base = getPublicSiteOrigin();
  const mailSubject = sameDayMailSubjectWithTimestamp(draft.subject);
  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (const s of recipients.subscribers) {
    const unsub = `${base}/api/unsubscribe?email=${encodeURIComponent(s.email)}`;
    const html = composeSameDaySubscriberEmailHtml({
      introMessage: draft.introMessage,
      items: draft.items,
      closingMessage: draft.closingMessage,
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
    total: recipients.subscribers.length,
    itemCount: draft.items.length,
    subject: mailSubject,
    audience,
    ...(lastError && failed > 0 ? { lastError } : {}),
  });
}
