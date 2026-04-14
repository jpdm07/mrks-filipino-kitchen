import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { clearSuggestionPoll } from "@/lib/suggestion-poll-store";

export async function DELETE() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await clearSuggestionPoll();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not clear poll data." }, { status: 500 });
  }
}
