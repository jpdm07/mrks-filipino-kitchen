"use client";

import Link from "next/link";

export function RecipePrintControls({
  backHref,
  bookHref,
  singleLabel = "Back to list",
  printViewHref,
  printViewLabel = "Open print layout",
}: {
  backHref: string;
  bookHref: string;
  singleLabel?: string;
  printViewHref?: string;
  printViewLabel?: string;
}) {
  return (
    <p className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm print:hidden">
      {printViewHref ? (
        <a
          href={printViewHref}
          className="rounded-lg border border-[color:var(--primary)]/40 bg-white px-4 py-2.5 font-semibold text-[color:var(--primary)] shadow-sm transition hover:bg-[color:var(--primary)]/5"
        >
          {printViewLabel}
        </a>
      ) : null}
      <button
        type="button"
        onClick={() => globalThis.print()}
        className="rounded-lg bg-[color:var(--primary)] px-4 py-2.5 font-semibold text-white shadow transition hover:brightness-110"
      >
        Print / Save as PDF
      </button>
      <span className="max-w-md text-slate-500">
        Uses your browser print dialog — &quot;Save as PDF&quot; on most devices.
      </span>
      <span className="w-full sm:w-auto sm:pl-2" />
      <Link
        href={backHref}
        className="font-medium text-amber-900 underline-offset-2 hover:underline"
      >
        {singleLabel}
      </Link>
      {bookHref ? (
        <Link
          href={bookHref}
          className="font-medium text-amber-900 underline-offset-2 hover:underline"
        >
          All recipes (book)
        </Link>
      ) : null}
    </p>
  );
}
