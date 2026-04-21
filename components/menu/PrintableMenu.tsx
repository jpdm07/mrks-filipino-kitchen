import { PhilippineSun } from "@/components/PhilippineSun";
import { SITE, salesTaxPercentLabel } from "@/lib/config";
import type { MenuItemDTO } from "@/lib/menu-types";
import {
  groupItemsForPrintMenu,
  normalizePrintMenuDescription,
} from "@/lib/printable-menu";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { splitMenuTakeoutLine } from "@/lib/menu-takeout-description-split";

const siteUrl = getPublicSiteOrigin();

function formatPrice(n: number) {
  return `$${n.toFixed(2)}`;
}

/** Printable handout body — used on `/takeout-menu`. */
export function PrintableMenu({ items }: { items: MenuItemDTO[] }) {
  const sections = groupItemsForPrintMenu(items);
  if (sections.length === 0) return null;

  return (
    <div
      className="print-menu-paper relative overflow-hidden rounded-2xl border border-neutral-200 bg-[color:var(--cream-deep)] px-5 py-7 text-[color:var(--text)] shadow-md sm:px-8 sm:py-9 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none"
    >
      <PhilippineSun
        size={128}
        color="rgba(0, 56, 168, 0.38)"
        decorative
        className="pointer-events-none absolute -right-2 -top-2 opacity-90 print:right-0 print:top-0 print:origin-top-right print:scale-[0.75]"
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[color:var(--primary)] opacity-80 print:h-0.5"
        aria-hidden
      />

      <header className="relative border-b border-neutral-300 pb-5 text-center print:border-neutral-400 print:pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--primary)]">
          Mula sa aming kusina
        </p>
        <h3 className="mt-2 font-playfair text-2xl font-bold tracking-tight text-[color:var(--text)] sm:text-3xl print:text-2xl">
          {SITE.name}
        </h3>
        <p className="mt-2 text-sm font-medium text-neutral-600">
          {SITE.location} · Pickup only
        </p>
        <div className="mx-auto mt-3 flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-neutral-800">
          <a
            href={SITE.phoneTel}
            className="font-semibold text-[color:var(--primary)] print:text-neutral-900"
          >
            {SITE.phoneDisplay}
          </a>
          <span className="hidden text-neutral-300 sm:inline" aria-hidden>
            |
          </span>
          <span className="text-neutral-600">{SITE.email}</span>
        </div>
      </header>

      <div className="relative mt-6 space-y-8 print:mt-5 print:space-y-6">
        {sections.map((sec) => (
          <div key={sec.category} className="print-menu-section">
            <h4 className="border-l-4 border-[color:var(--gold-muted)] pl-3 font-playfair text-lg font-black italic tracking-wide text-[color:var(--primary)] print:text-base">
              {sec.category}
            </h4>
            <ul className="mt-3 space-y-4 print:mt-2 print:space-y-3">
              {sec.items.map((item) => (
                <li
                  key={item.id}
                  className="print-menu-item border-b border-dotted border-neutral-300 pb-3 last:border-0 last:pb-0 print:pb-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="font-semibold text-neutral-900">
                      {item.name}
                      {item.soldOut ? (
                        <span className="ml-2 text-xs font-normal uppercase tracking-wide text-[color:var(--gold-dark)]">
                          Ask
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {item.description ? (
                    (() => {
                      const raw = normalizePrintMenuDescription(
                        item.description
                      );
                      const parts = splitMenuTakeoutLine(raw);
                      const descClass =
                        "mt-1 text-left text-xs leading-relaxed text-neutral-700 sm:text-sm print:text-[10pt] print:leading-snug";
                      if (!parts.dipNote) {
                        return <p className={descClass}>{raw}</p>;
                      }
                      return (
                        <p className={descClass}>
                          {[parts.lead, parts.dipNote].filter(Boolean).join(" ")}
                        </p>
                      );
                    })()
                  ) : null}
                  <ul className="mt-2 space-y-1 text-sm text-neutral-800 print:text-[10pt]">
                    {item.sizes.map((s) => (
                      <li
                        key={s.key}
                        className="flex justify-between gap-4 border-b border-transparent"
                      >
                        <span className="text-neutral-600">{s.label}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-neutral-900">
                          {formatPrice(s.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <footer className="relative mt-8 border-t border-neutral-300 pt-5 text-center text-xs text-neutral-600 print:mt-6 print:pt-4 print:text-[9pt]">
        <p className="font-medium text-neutral-800">
          Order online:{" "}
          <span className="break-all text-[color:var(--primary)] print:text-neutral-900">
            {siteUrl}/menu
          </span>
        </p>
        <p className="mt-1 font-medium text-neutral-800">
          Printable menu:{" "}
          <span className="break-all text-[color:var(--primary)] print:text-neutral-900">
            {siteUrl}/takeout-menu
          </span>
        </p>
        <p className="mt-2 text-neutral-600">
          Prices and availability subject to change. Texas sales tax applies at checkout (
          {salesTaxPercentLabel()} in Cypress).
        </p>
      </footer>
    </div>
  );
}
