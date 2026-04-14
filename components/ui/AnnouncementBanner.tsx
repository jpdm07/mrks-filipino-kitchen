"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/** Bump suffix when you want the banner to reappear for users who dismissed an older version. */
const KEY = "mrk_banner_biweekly_v2_dismissed";

export function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      data-site-chrome
      className="relative z-30 flex flex-wrap items-center justify-center gap-2 border-b border-[var(--gold)]/40 px-3 py-3 text-center text-sm font-medium text-[var(--text)] print:hidden sm:gap-3 sm:px-4"
      style={{ background: "var(--gold)" }}
    >
      <p className="min-w-0 flex-1 basis-[min(100%,280px)] leading-snug sm:basis-auto">
        🎉 Now accepting bulk recurring orders every 2 weeks! · Call/text{" "}
        <a
          href="tel:+19797033827"
          className="font-semibold underline decoration-[var(--primary)] decoration-2 underline-offset-2 transition hover:text-[var(--primary)]"
        >
          979-703-3827
        </a>
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* ignore */
          }
          setVisible(false);
        }}
        className="btn-icon h-11 w-11 shrink-0 border-[var(--primary)]/25 bg-white/70 text-[var(--text)] hover:bg-white"
        aria-label="Dismiss announcement"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
