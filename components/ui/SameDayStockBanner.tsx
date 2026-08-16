"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { SiteBannerEntry } from "@/lib/lumpia-inventory-banners";

/**
 * One compact same-day strip for all in-stock items.
 * Collapsible for this page view; always visible again on the next visit.
 */
export function SameDayStockBanner({
  entries,
}: {
  entries: SiteBannerEntry[];
}) {
  const [open, setOpen] = useState(true);

  if (entries.length === 0) return null;

  return (
    <div
      className="print:hidden relative z-40 w-full border-b-4 border-[var(--gold)] bg-[var(--primary-deep)] text-white shadow-[0_8px_24px_rgba(6,15,31,0.28)]"
      role="status"
    >
      <div className="mx-auto max-w-5xl px-4 py-3.5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                aria-expanded={open}
              >
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--gold)] sm:text-xs">
                  Same-day pickup · in stock now
                  {entries.length > 1 ? ` · ${entries.length} items` : ""}
                </p>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[var(--gold)] transition ${
                    open ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>
            </div>
            {open ? (
              <>
                <ul className="mt-2 space-y-1.5">
                  {entries.map((entry) => (
                    <li
                      key={entry.key}
                      className="text-base font-semibold leading-snug sm:text-lg"
                    >
                      <span className="font-extrabold tracking-tight">
                        {entry.title ?? entry.message}
                      </span>
                      {entry.availability ? (
                        <span className="font-bold text-[var(--gold)]">
                          {" — "}
                          {entry.availability}
                          {entry.styleNote ? (
                            <span className="ml-1.5 text-sm font-semibold text-white/85">
                              · {entry.styleNote}
                            </span>
                          ) : null}
                        </span>
                      ) : entry.title ? (
                        <span className="ml-1.5 text-sm font-medium text-white/85">
                          {entry.message}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs font-medium text-white/75 sm:text-sm">
                  Limited quantity · choose your pickup time at checkout
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold text-white/85">
                Tap to see what’s available
              </p>
            )}
          </div>
          <Link
            href="/menu"
            className="btn btn-primary btn-sm relative z-10 shrink-0 self-start whitespace-nowrap !px-5 !py-2.5 !text-sm !font-extrabold"
          >
            Order now
          </Link>
        </div>
      </div>
    </div>
  );
}
