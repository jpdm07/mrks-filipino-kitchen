import { NextRequest } from "next/server";
import { AVAILABILITY_LIVE_POLL_MS } from "@/lib/availability-live-sync";
import {
  buildKitchenOpenDatesPayload,
  buildUnifiedDisplayOpenDatesPayload,
} from "@/lib/kitchen-availability-merge";
import { kickGoogleAvailabilityBackgroundSync } from "@/lib/google-availability-stale-sync";
import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";

export const dynamic = "force-dynamic";

/**
 * SSE: same payloads as GET /api/availability (poll every few seconds).
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
  const cartParam = searchParams.get("cartMode") ?? "mixed";
  const cartMode =
    cartParam === "flan" ? "flan" : cartParam === "all" ? "all" : "mixed";
  const mainNeed = Number(searchParams.get("mainNeed") || "0");
  const flanNeed = Number(searchParams.get("flanNeed") || "0");

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = async () => {
        if (closed) return;
        try {
          kickGoogleAvailabilityBackgroundSync();
          const mainN = Number.isFinite(mainNeed) ? mainNeed : 0;
          const flanN = Number.isFinite(flanNeed) ? flanNeed : 0;
          const payload =
            cartMode === "all"
              ? await buildUnifiedDisplayOpenDatesPayload(fromYmd, toYmd, {
                  mainMinutesNeeded: mainN,
                  flanRamekinsNeeded: flanN,
                })
              : await buildKitchenOpenDatesPayload(fromYmd, toYmd, {
                  cartFlanOnly: cartMode === "flan",
                  mainMinutesNeeded: mainN,
                  flanRamekinsNeeded: flanN,
                });
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
      }, AVAILABILITY_LIVE_POLL_MS);

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
