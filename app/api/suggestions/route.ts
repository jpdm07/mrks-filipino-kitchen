import { NextRequest, NextResponse } from "next/server";
import {
  addSuggestionVotes,
  listSuggestions,
  presetSuggestionsFromConfig,
} from "@/lib/suggestion-poll-store";

export async function GET() {
  try {
    const suggestions = await listSuggestions();
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({
      suggestions: presetSuggestionsFromConfig(),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      votes?: string[];
      writeIn?: string;
    };
    const votes = Array.isArray(body.votes) ? body.votes : [];
    const writeIn = (body.writeIn ?? "").trim();

    await addSuggestionVotes(votes, writeIn || undefined);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not save votes. If you are on a read-only host, use a writable deployment or fix database access.",
      },
      { status: 503 }
    );
  }
}
