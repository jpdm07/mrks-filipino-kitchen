import { prisma } from "@/lib/prisma";

export type NewsletterAudience = "all" | "selected";

const MAX_SELECTED = 2000;

export function parseNewsletterAudience(raw: unknown): NewsletterAudience | null {
  if (raw === "all" || raw === "selected") return raw;
  return null;
}

function parseIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (typeof v !== "string") continue;
    const id = v.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_SELECTED) break;
  }
  return out;
}

export async function resolveNewsletterRecipients(params: {
  audience: NewsletterAudience;
  subscriberIds?: unknown;
}): Promise<
  | { ok: true; subscribers: { id: string; email: string; name: string | null }[] }
  | { ok: false; error: string }
> {
  if (params.audience === "all") {
    const subscribers = await prisma.subscriber.findMany({
      select: { id: true, email: true, name: true },
      orderBy: { createdAt: "asc" },
    });
    if (!subscribers.length) {
      return { ok: false, error: "No subscribers on the list yet." };
    }
    return { ok: true, subscribers };
  }

  const ids = parseIdList(params.subscriberIds);
  if (!ids.length) {
    return {
      ok: false,
      error:
        "Select at least one subscriber to send to (or switch to the full list).",
    };
  }

  const subscribers = await prisma.subscriber.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, name: true },
  });
  if (!subscribers.length) {
    return { ok: false, error: "None of the selected subscribers were found." };
  }
  return { ok: true, subscribers };
}
