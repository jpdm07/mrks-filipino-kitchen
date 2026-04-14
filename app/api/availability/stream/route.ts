import { NextRequest } from "next/server";
import { getPublicAvailabilityWhitelistPayload } from "@/lib/availability-server";
import { maybeSyncGoogleAvailabilityFromPublicRequest } from "@/lib/google-availability-stale-sync";
import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";

export const dynamic = "force-dynamic";

/**
 * SSE: pushes the same whitelist as GET /api/availability (only DB isOpen === true).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let from = searchParams.get("from");
  let to = searchParams.get("to");
  if (
    !from ||
    !to ||
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    from > to
  ) {
    const t = getTodayInPickupTimezoneYMD();
    from = t;
    to = addCalendarDaysYMD(t, 120);
  }

  const encoder = new TextEncoder();
  const fromYmd = from;
  const toYmd = to;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = async () => {
        if (closed) return;
        try {
          try {
            await maybeSyncGoogleAvailabilityFromPublicRequest();
          } catch (e) {
            console.warn("[mrk] Google availability auto-sync (stream):", e);
          }
          const payload = await getPublicAvailabilityWhitelistPayload(
            fromYmd,
            toYmd
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ openDates: [], notes: {} })}\n\n`
            )
          );
        }
      };

      await send();
      const interval = setInterval(() => {
        void send();
      }, 10000);

      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          /* closed */
        }
      }, 30000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
