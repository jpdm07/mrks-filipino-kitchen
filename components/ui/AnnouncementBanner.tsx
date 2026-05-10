"use client";

import Link from "next/link";

/**
 * Lead-time notice — in document flow (not fixed/sticky) so it scrolls away with the page.
 * Placed above the sticky navbar in AppShell.
 */
export function AnnouncementBanner() {
  return (
    <div
      className="print:hidden relative z-40 w-full border-b border-[color:var(--gold-muted)]/45 bg-[rgba(251,246,236,0.97)] text-[color:var(--primary)] shadow-[inset_0_-1px_0_rgba(6,15,31,0.06)]"
      role="status"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-2.5 sm:py-3">
        <p className="text-center text-[13px] leading-snug sm:text-[15px]">
          <span className="font-semibold">Advance scheduling required.</span> Pickup orders are
          fulfilled by appointment — please allow several days&apos; notice.{" "}
          Same-day orders are not available.{" "}
          For next openings, see{" "}
          <Link
            href="/availability"
            className="font-semibold text-[color:var(--primary)] underline decoration-[color:var(--gold)] underline-offset-2 hover:opacity-90"
          >
            Pick Up Dates
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
