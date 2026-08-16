"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { SiteBannerEntry } from "@/lib/lumpia-inventory-banners";

/**
 * One compact same-day strip for all in-stock items.
 * Dismissible for this page view only — comes back on the next visit / refresh.
 */
export function SameDayStockBanner({
  entries,
}: {
  entries: SiteBannerEntry[];
}) {
  const [show, setShow] = useState(true);

  if (!show || entries.length === 0) return null;

  return (
    <div
      className="print:hidden relative z-40 w-full border-b-4 border-[var(--gold)] bg-[var(--primary-deep)] text-white shadow-[0_8px_24px_rgba(6,15,31,0.28)]"
      role="status"
    >
      <div className="relative mx-auto max-w-5xl px-4 py-3.5 pr-12 sm:py-4 sm:pr-14">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--gold)] sm:text-xs">
              Same-day pickup · in stock now
              {entries.length > 1 ? ` · ${entries.length} items` : ""}
            </p>
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
          </div>
          <Link
            href="/menu"
            className="btn btn-primary btn-sm relative z-10 mx-auto shrink-0 whitespace-nowrap !px-5 !py-2.5 !text-sm !font-extrabold sm:mx-0"
          >
            Order now
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="absolute right-3 top-3 shrink-0 rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white sm:right-4 sm:top-3.5"
          aria-label="Dismiss same-day pickup notice"
        >
          <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
