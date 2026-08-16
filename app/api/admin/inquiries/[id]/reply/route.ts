import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sendCustomerInquiryReplyEmail } from "@/lib/send-customer-inquiry-email";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inquiryId = (params.id ?? "").trim();
  if (!inquiryId) {
    return NextResponse.json({ error: "Missing inquiry id" }, { status: 400 });
  }

  let body: { message?: string };
  try {
    body = (await req.json()) as { message?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
  }
  if (message.length > 8000) {
    return NextResponse.json({ error: "Reply is too long." }, { status: 400 });
  }

  const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  }

  const result = await sendCustomerInquiryReplyEmail({
    name: inquiry.name,
    email: inquiry.email,
    subject: inquiry.subject,
    originalMessage: inquiry.message,
    reply: message,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await prisma.inquiry.update({
    where: { id: inquiryId },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
