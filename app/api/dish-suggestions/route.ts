import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailableError } from "@/lib/safe-db";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { text?: string };
    const text = (body.text ?? "").trim();
    if (text.length < 2) {
      return NextResponse.json({ error: "Please enter a suggestion." }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Suggestion is too long." }, { status: 400 });
    }
    const fwd = req.headers.get("x-forwarded-for");
    const ipAddress = fwd?.split(",")[0]?.trim() || null;
    await prisma.dishSuggestionSubmission.create({
      data: { text, ipAddress },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json(
        { error: "Could not save right now. Please try again later." },
        { status: 503 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
