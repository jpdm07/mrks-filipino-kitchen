"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BusinessCardSheet } from "./BusinessCardSheet";

export function BusinessCardPublicPage() {
  useEffect(() => {
    document.body.dataset.page = "business-card";
    return () => {
      delete document.body.dataset.page;
    };
  }, []);

  return (
    <div className="business-card-public flex flex-col items-center">
      <div className="mb-8 max-w-lg space-y-2 text-center text-sm text-[var(--text-muted)] print:hidden">
        <p>
          Optimized for <strong className="text-[var(--text)]">US Letter</strong> (8.5&quot; ×
          11&quot;) cardstock: <strong className="text-[var(--text)]">eight</strong> cards per
          sheet in two columns. Each card is still{" "}
          <strong className="text-[var(--text)]">3.5&quot; × 2&quot;</strong> (standard size).
        </p>
        <p>
          Print at <strong className="text-[var(--text)]">100% scale</strong> (actual size, not “fit
          to page”). Turn off{" "}
          <strong className="text-[var(--text)]">headers and footers</strong>. After printing, cut
          along the small gaps between cards (about ⅛&quot; spacing).
        </p>
        <p className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left">
          <strong className="text-[var(--text)]">HP Envy 4500 (and similar):</strong> In the browser
          print preview, set scaling to <strong>100%</strong> (not “Fit to page”). In the HP print
          dialog / preferences, pick paper type <strong>Plain</strong> or{" "}
          <strong>Cardstock</strong>, and use <strong>Best</strong> or{" "}
          <strong>Normal</strong> quality so the blue/red/gold panel prints clearly. If a sliver of
          the grid still clips, try <strong>Minimize margins</strong> in the browser only if it
          offers that — the page already leaves a half-inch safe area.
        </p>
      </div>
      <BusinessCardSheet />
      <Link
        href="/"
        className="mt-10 text-sm font-semibold text-[var(--primary)] underline print:hidden"
      >
        ← Back to site
      </Link>
    </div>
  );
}
