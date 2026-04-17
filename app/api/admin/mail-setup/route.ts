import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import {
  getMailEnvStatus,
  getOwnerOrderNotificationEmail,
} from "@/lib/mail-env-status";
import { sendMail } from "@/lib/mailer";

/** Admin: read mail env summary (no secrets). */
export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getMailEnvStatus());
}

/** Admin: send a one-line test email to the same address as new-order notifications. */
export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const to = getOwnerOrderNotificationEmail();
  if (!to) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No recipient configured. Set OWNER_ORDER_EMAIL or EMAIL_USER on Vercel.",
      },
      { status: 400 }
    );
  }
  const r = await sendMail({
    to,
    subject: "[Mr K's Filipino Kitchen] Mail test",
    html: "<p>If you received this, outbound email from the website is working.</p><p>You can ignore this message.</p>",
    text: "If you received this, outbound email from the website is working.",
  });
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: r.error, attemptedTo: to },
      { status: 503 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: `Test email sent to ${to}. Check inbox and spam.`,
  });
}
