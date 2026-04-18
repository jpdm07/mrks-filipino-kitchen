import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOwnerInquiryEmail } from "@/lib/send-owner-inquiry-email";
import { sendOwnerSms } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      subject?: string;
      message?: string;
    };
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const subject = (body.subject ?? "").trim() || "Website inquiry";
    const message = (body.message ?? "").trim();
    if (!name || !email || !phone || !message) {
      return NextResponse.json(
        { error: "Name, email, phone, and message are required" },
        { status: 400 }
      );
    }

    await prisma.inquiry.create({
      data: { name, email, phone, subject, message },
    });

    const sms = `📩 NEW INQUIRY\n${subject}\nFrom: ${name} | ${phone}\n${email}\n${message.slice(0, 400)}`;
    await sendOwnerSms(sms);

    const mail = await sendOwnerInquiryEmail({
      name,
      email,
      phone,
      subject,
      message,
    });
    if (!mail.ok) {
      console.warn("[inquiries] Owner inquiry email was not delivered:", mail.error);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
