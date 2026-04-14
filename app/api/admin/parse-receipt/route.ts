import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 503 }
    );
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const mime = file.type || "image/jpeg";
  const mediaType =
    mime === "image/png"
      ? "image/png"
      : mime === "image/webp"
        ? "image/webp"
        : mime === "application/pdf"
          ? "application/pdf"
          : "image/jpeg";

  const prompt = `You are reading a grocery or supply store receipt for a small Filipino food kitchen business called Mr. K's Filipino Kitchen.

Extract the following information from this receipt and return ONLY valid JSON, no other text:

{
  "store": "store name",
  "date": "YYYY-MM-DD format, use today if not visible",
  "total": 0.00,
  "items": [
    {
      "description": "item name",
      "quantity": 1,
      "unitPrice": 0.00,
      "lineTotal": 0.00
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "confidence": "high or low — high if you can clearly read the receipt, low if it is blurry or partial"
}

If you cannot determine a value, use null for that field.
Do not include any text outside of the JSON object.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
    if (!response.ok) {
      const t = await response.text();
      console.warn("Anthropic receipt parse failed:", response.status, t);
      return NextResponse.json(
        { error: "Receipt parsing failed. Try manual entry." },
        { status: 502 }
      );
    }
    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse receipt response." },
        { status: 502 }
      );
    }
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return NextResponse.json({ parsed });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Receipt parsing error" }, { status: 500 });
  }
}
