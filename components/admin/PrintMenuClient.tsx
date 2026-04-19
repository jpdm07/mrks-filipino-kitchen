"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { PAYMENT_INSTRUCTIONS, SITE, salesTaxPercentLabel } from "@/lib/config";
import { buildMenuGridEntries, type MenuGridEntry } from "@/lib/menu-grid-entries";
import type { MenuItemDTO } from "@/lib/menu-types";
import { useAdminDataSync } from "@/lib/use-admin-data-sync";

type MenuItemWithStock = MenuItemDTO & { stockNotes?: string | null };

function money(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function splitForColumns(entries: MenuGridEntry[]): [MenuGridEntry[], MenuGridEntry[]] {
  if (entries.length <= 1) return [entries, []];
  const mid = Math.ceil(entries.length / 2);
  return [entries.slice(0, mid), entries.slice(mid)];
}

function categoryOfEntry(e: MenuGridEntry): string {
  if (e.kind === "group") return e.variants[0]?.category ?? "Menu";
  return e.item.category;
}

function PrintMenuColumn({
  entries,
  startCategory,
  className = "",
}: {
  entries: MenuGridEntry[];
  startCategory: string | null;
  className?: string;
}) {
  const blocks: ReactNode[] = [];
  let lastCat: string | null = startCategory;
  for (const entry of entries) {
    const cat = categoryOfEntry(entry);
    const showCat = cat !== lastCat;
    if (showCat) lastCat = cat;
    blocks.push(
      <div key={entry.kind === "group" ? `g-${entry.groupKey}` : entry.item.id}>
        {showCat ? (
          <h3 className="mb-3 border-b-2 border-[#0038a8] pb-1 font-[family-name:var(--font-playfair)] text-[11px] font-bold uppercase tracking-[0.2em] text-[#0038a8]">
            {cat}
          </h3>
        ) : null}
        {entry.kind === "group" ? (
          <PrintGroupBlock entry={entry} />
        ) : (
          <PrintSingleBlock item={entry.item} />
        )}
      </div>
    );
  }
  return (
    <div className={`print-menu-column space-y-5 pr-4 print:pr-3 ${className}`}>
      {blocks}
    </div>
  );
}

function PrintGroupBlock({ entry }: { entry: Extract<MenuGridEntry, { kind: "group" }> }) {
  const v0 = entry.variants[0];
  const title =
    v0?.groupCardTitle?.trim() ||
    v0?.name.replace(/:.*$/, "").trim() ||
    "Specialties";
  return (
    <div className="break-inside-avoid">
      <h4 className="font-[family-name:var(--font-playfair)] text-base font-bold leading-tight text-[#14121a]">
        {title}
      </h4>
      {v0?.groupServingBlurb ? (
        <p className="mt-0.5 text-[9px] leading-snug text-[#5c5866]">{v0.groupServingBlurb}</p>
      ) : null}
      <div className="mt-2 space-y-3">
        {entry.variants.map((item) => (
          <PrintSingleBlock key={item.id} item={item} nested />
        ))}
      </div>
    </div>
  );
}

function PrintSingleBlock({
  item,
  nested = false,
}: {
  item: MenuItemWithStock;
  nested?: boolean;
}) {
  const label =
    item.variantShortLabel?.trim() ||
    item.name.replace(/^[^:]+:\s*/, "").trim() ||
    item.name;
  const header = nested ? label : item.name;
  const sold = item.soldOut;
  const note = item.stockNotes?.trim();

  return (
    <div className={`break-inside-avoid ${nested ? "" : "border-b border-dotted border-stone-200 pb-3"}`}>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`font-semibold leading-snug text-[#14121a] ${nested ? "text-[11px]" : "text-[12px]"}`}
        >
          {header}
          {sold ? (
            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-[#a80d1f]">
              Sold out
            </span>
          ) : null}
        </span>
      </div>
      <ul className="mt-1 space-y-0.5 pl-0">
        {item.sizes.map((sz) => (
          <li
            key={sz.key}
            className="flex items-baseline justify-between gap-3 text-[10.5px] leading-tight text-[#14121a]"
          >
            <span className="text-[#5c5866]">{sz.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{money(sz.price)}</span>
          </li>
        ))}
      </ul>
      {note ? (
        <p className="mt-1 text-[8.5px] italic leading-snug text-[#5c5866]">{note}</p>
      ) : null}
    </div>
  );
}

export function PrintMenuClient() {
  const [items, setItems] = useState<MenuItemWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/menu", { cache: "no-store", credentials: "same-origin" });
      const data = (await r.json()) as { items?: MenuItemWithStock[]; error?: string };
      if (!r.ok) throw new Error(data.error || "Could not load menu");
      setItems(Array.isArray(data.items) ? data.items : []);
      setFetchedAt(new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAdminDataSync(() => load({ silent: true }));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("mrk-admin-print-menu");
    return () => root.classList.remove("mrk-admin-print-menu");
  }, []);

  const entries = useMemo(() => {
    const active = items.filter((i) => i.isActive);
    return buildMenuGridEntries(active);
  }, [items]);

  const [leftEntries, rightEntries] = useMemo(
    () => splitForColumns(entries),
    [entries]
  );

  const lastLeftCat =
    leftEntries.length > 0
      ? categoryOfEntry(leftEntries[leftEntries.length - 1]!)
      : null;
  const firstRightCat =
    rightEntries.length > 0 ? categoryOfEntry(rightEntries[0]!) : null;
  const rightColumnStartCategory =
    lastLeftCat && firstRightCat === lastLeftCat ? lastLeftCat : null;

  const handlePrint = () => {
    const prev = document.title;
    document.title = "Mr. K's Filipino Kitchen — Menu";
    window.print();
    document.title = prev;
  };

  return (
    <div className="print-menu-scope">
      <div className="print:hidden">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--primary)]">
          Handout menu (print)
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--text-muted)]">
          Live prices and items from your public menu (same as Menu Manager / website). Refresh
          happens automatically about every 20s while this tab is open.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-full border-2 border-[var(--primary)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90"
          >
            Print or save as PDF
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold hover:bg-[var(--gold-light)]"
          >
            Refresh now
          </button>
          {fetchedAt ? (
            <span className="text-sm text-[var(--text-muted)]">Last loaded: {fetchedAt}</span>
          ) : null}
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
          <p className="font-semibold">Printing (letter, two-sided)</p>
          <p className="mt-2 leading-relaxed">
            Browsers cannot turn on two-sided printing or pick the flip direction for you — that is
            controlled by the print dialog and your printer. This page is styled as{" "}
            <strong>exactly two pages</strong> so when you enable <strong>Print on both sides</strong>, page
            2 lines up as the back of the same sheet.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1.5">
            <li>
              <strong>Paper:</strong> US Letter, <strong>Portrait</strong>.
            </li>
            <li>
              <strong>Two-sided:</strong> On — then try <strong>Flip on long edge</strong> first (best match for
              this layout). If the back prints upside-down relative to the front, switch to{" "}
              <strong>short edge</strong> once; many drivers remember it for next time.
            </li>
            <li>
              <strong>One sheet:</strong> Page 1 = cover + contact (outside); page 2 = menu (inside when
              folded).
            </li>
            <li>
              <strong>PDF:</strong> Choose “Save as PDF” in the print dialog — same two-page structure.
            </li>
          </ul>
        </div>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {loading && !items.length ? <p className="mt-4 text-[var(--text-muted)]">Loading menu…</p> : null}
      </div>

      {/* Printable document — id used for print-only isolation */}
      <div
        id="mrk-print-menu-document"
        className="print-document mx-auto mt-8 max-w-5xl print:mt-0 print:max-w-none"
      >
        {/* Page 1 — outside: cover | back */}
        <section className="print-menu-sheet-1 print-sheet mb-8 overflow-hidden rounded-lg border border-stone-300 bg-white shadow-lg print:mb-0 print:rounded-none print:shadow-none">
          <div className="grid min-h-[9.25in] grid-cols-1 md:grid-cols-2 print:min-h-0 print:grid-cols-2">
            <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#071229] via-[#0a1e3d] to-[#0a1628] px-8 py-12 text-center print:px-6 print:py-10">
              <div className="rounded-2xl border border-[#ffc72c]/40 bg-black/20 px-6 py-8 print:px-4 print:py-6">
                <Logo size="xl" light />
                <p className="mt-6 font-[family-name:var(--font-playfair)] text-2xl font-bold tracking-tight text-white print:text-xl">
                  Mr. K&apos;s Filipino Kitchen
                </p>
                <div className="mx-auto mt-3 h-px w-24 bg-[#ffc72c]/90" />
                <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.28em] text-[#ffe08a]">
                  Authentic home cooking
                </p>
                <p className="mt-2 text-sm text-white/85">Pickup · {SITE.location}</p>
              </div>
            </div>
            <div className="flex flex-col justify-center bg-[#fffbf5] px-8 py-10 print:px-6 print:py-8">
              <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#0038a8]">
                Visit &amp; order
              </h2>
              <ul className="mt-4 space-y-2.5 text-[11px] leading-relaxed text-[#14121a]">
                <li>
                  <span className="font-semibold text-[#5c5866]">Phone</span>
                  <br />
                  <span className="text-base font-semibold tabular-nums">{SITE.phoneDisplay}</span>
                </li>
                <li>
                  <span className="font-semibold text-[#5c5866]">Email</span>
                  <br />
                  {SITE.email}
                </li>
                <li>
                  <span className="font-semibold text-[#5c5866]">Web</span>
                  <br />
                  {SITE.publicUrl.replace(/^https:\/\//, "")}
                </li>
                <li>
                  <span className="font-semibold text-[#5c5866]">Facebook</span>
                  <br />
                  {SITE.facebookUrl.replace(/^https:\/\//, "")}
                </li>
                <li>
                  <span className="font-semibold text-[#5c5866]">Location</span>
                  <br />
                  {SITE.location}
                </li>
              </ul>
              <p className="mt-6 border-t border-stone-200 pt-4 text-[9px] leading-snug text-[#5c5866]">
                Pickup only. Texas sales tax applies to taxable items ({salesTaxPercentLabel()}). Prices
                and availability subject to change — always current on the website.
              </p>
              <p className="mt-2 text-[9px] text-[#5c5866]">
                Pay at pickup: Zelle {PAYMENT_INSTRUCTIONS.zellePhone} · Venmo{" "}
                {PAYMENT_INSTRUCTIONS.venmoHandle} · Cash App {PAYMENT_INSTRUCTIONS.cashAppCashtag}
              </p>
            </div>
          </div>
        </section>

        {/* Page 2 — inside menu (back of same sheet when duplex) */}
        <section className="print-menu-sheet-2 print-sheet overflow-hidden rounded-lg border border-stone-300 bg-[#fffbf5] shadow-lg print:rounded-none print:shadow-none">
          <div className="border-b border-[#0038a8]/25 bg-white/80 px-6 py-3 print:px-4 print:py-2">
            <p className="text-center font-[family-name:var(--font-playfair)] text-lg font-bold text-[#0038a8]">
              Menu
            </p>
            <p className="text-center text-[9px] uppercase tracking-[0.2em] text-[#5c5866]">
              {SITE.name} · {SITE.location}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-0 p-5 md:grid-cols-2 print:grid-cols-2 print:p-4">
            {entries.length === 0 && !loading ? (
              <p className="col-span-2 p-8 text-center text-sm text-[#5c5866]">
                No active menu items — turn items on in Menu Manager or check the API.
              </p>
            ) : (
              <>
                <PrintMenuColumn entries={leftEntries} startCategory={null} />
                <PrintMenuColumn
                  entries={rightEntries}
                  startCategory={rightColumnStartCategory}
                  className="border-l border-stone-300 pl-4 md:pl-6 print:pl-4"
                />
              </>
            )}
          </div>
          <div className="border-t border-stone-200 px-5 py-3 text-center text-[8px] text-[#5c5866] print:px-4">
            {fetchedAt ? `Menu snapshot: ${fetchedAt}. ` : null}
            {SITE.publicUrl} · {SITE.phoneDisplay}
          </div>
        </section>
      </div>

      <style jsx global>{`
        /* Isolate menu so only these two pages print (helps duplex drivers). */
        @media print {
          html.mrk-admin-print-menu body * {
            visibility: hidden;
          }
          html.mrk-admin-print-menu #mrk-print-menu-document,
          html.mrk-admin-print-menu #mrk-print-menu-document * {
            visibility: visible;
          }
          html.mrk-admin-print-menu #mrk-print-menu-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            max-width: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-menu-scope .print\\:hidden {
            display: none !important;
          }

          @page {
            size: letter portrait;
            margin: 0.35in;
          }

          html.mrk-admin-print-menu .print-menu-sheet-1 {
            break-after: page;
            page-break-after: always;
          }
          html.mrk-admin-print-menu .print-menu-sheet-2 {
            break-before: auto;
            page-break-before: auto;
          }
        }
      `}</style>
    </div>
  );
}
