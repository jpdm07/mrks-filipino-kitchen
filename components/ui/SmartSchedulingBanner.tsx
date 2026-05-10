import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { resolvedInventoryBannerMessage } from "@/lib/inventory-banner-copy";

const WRAPPER =
  "print:hidden relative z-40 w-full border-b border-[color:var(--gold-muted)]/45 bg-[rgba(251,246,236,0.97)] text-[color:var(--primary)] shadow-[inset_0_-1px_0_rgba(6,15,31,0.06)]";

/**
 * Single site-wide scheduling + same-day inventory banner (replaces static announcement + separate stock strips).
 */
export async function SmartSchedulingBanner() {
  const path = headers().get("x-mrk-pathname") ?? "";
  if (path.startsWith("/admin")) return null;

  const origin = getPublicSiteOrigin();
  const availabilityAbsolute = `${origin}/availability`;

  let forceStateA = false;
  let sameDayItems: Awaited<ReturnType<typeof prisma.inventoryItem.findMany>> = [];

  try {
    const [settings, items] = await Promise.all([
      prisma.pricingSettings.findUnique({ where: { id: "default" } }),
      prisma.inventoryItem.findMany({
        where: {
          showBanner: true,
          isAvailable: true,
          quantityInStock: { gt: 0 },
        },
        orderBy: { id: "asc" },
      }),
    ]);
    forceStateA = settings?.schedulingBannerForceStateA === true;
    sameDayItems = items;
  } catch {
    /* DB unavailable — fall back to State A messaging only */
  }

  const stateB = !forceStateA && sameDayItems.length > 0;

  return (
    <div className={WRAPPER} role="status">
      <div className="mx-auto max-w-5xl px-4 py-2.5 sm:py-3">
        {stateB ? (
          <div className="space-y-3">
            <p className="text-center text-[13px] leading-snug sm:text-[15px]">
              <span className="font-semibold">Most orders require advance scheduling</span>{" "}
              — please allow several days&apos; notice. However, select items are available
              for same-day pickup today. See what&apos;s available below.{" "}
              For next openings, see{" "}
              <Link
                href={availabilityAbsolute}
                className="font-semibold text-[color:var(--primary)] underline decoration-[color:var(--gold)] underline-offset-2 hover:opacity-90"
              >
                Pick Up Dates
              </Link>
              .
            </p>
            <div className="space-y-3 border-t border-[color:var(--gold-muted)]/35 pt-3">
              {sameDayItems.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:gap-4"
                >
                  <p className="text-center text-[13px] leading-snug sm:flex-1 sm:text-left sm:text-[15px]">
                    {resolvedInventoryBannerMessage(inv)}
                  </p>
                  <Link
                    href={`${origin}/order`}
                    className="btn btn-primary btn-sm shrink-0 whitespace-nowrap"
                  >
                    Order for Pickup
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-[13px] leading-snug sm:text-[15px]">
            <span className="font-semibold">Advance scheduling required.</span> Pickup orders are
            fulfilled by appointment — please allow several days&apos; notice. Same-day orders
            are not available. For next openings, see{" "}
            <Link
              href={availabilityAbsolute}
              className="font-semibold text-[color:var(--primary)] underline decoration-[color:var(--gold)] underline-offset-2 hover:opacity-90"
            >
              Pick Up Dates
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
