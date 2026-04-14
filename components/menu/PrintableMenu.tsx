import { SITE, salesTaxPercentLabel } from "@/lib/config";
import type { MenuItemDTO } from "@/lib/menu-types";
import {
  groupItemsForPrintMenu,
  truncateMenuDescription,
} from "@/lib/printable-menu";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

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
      className="print-menu-paper relative overflow-hidden rounded-3xl border-2 border-[var(--primary)] bg-[#fffefb] px-6 py-8 shadow-[var(--shadow-lg)] sm:px-10 sm:py-10 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none"
      style={{
        backgroundImage: `
              linear-gradient(165deg, rgba(0, 56, 168, 0.04) 0%, transparent 42%),
              linear-gradient(335deg, rgba(206, 17, 38, 0.03) 0%, transparent 38%),
              linear-gradient(180deg, rgba(232, 185, 35, 0.06) 0%, transparent 28%)
            `,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-90 print:h-1"
        style={{
          background: `repeating-linear-gradient(
                -55deg,
                var(--gold) 0px,
                var(--gold) 4px,
                rgba(0, 56, 168, 0.35) 4px,
                rgba(0, 56, 168, 0.35) 8px,
                var(--accent) 8px,
                var(--accent) 12px,
                rgba(255, 255, 255, 0.5) 12px,
                rgba(255, 255, 255, 0.5) 16px
              )`,
        }}
        aria-hidden
      />

      <header className="relative border-b-2 border-[var(--gold)] pb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Mula sa aming kusina
        </p>
        <h3 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          {SITE.name}
        </h3>
        <p className="mt-2 text-sm font-medium text-[var(--text-muted)]">
          {SITE.location} · Pickup only
        </p>
        <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-[var(--text)]">
          <a href={SITE.phoneTel} className="font-semibold print:text-[var(--text)]">
            {SITE.phoneDisplay}
          </a>
          <span className="hidden text-[var(--border)] sm:inline" aria-hidden>
            |
          </span>
          <span className="text-[var(--text-muted)]">{SITE.email}</span>
        </div>
      </header>

      <div className="relative mt-8 space-y-10">
        {sections.map((sec) => (
          <div key={sec.category} className="print-menu-section">
            <h4 className="flex items-center gap-3 border-l-4 border-[var(--accent)] pl-4 font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--primary)]">
              {sec.category}
            </h4>
            <ul className="mt-4 space-y-5">
              {sec.items.map((item) => (
                <li
                  key={item.id}
                  className="print-menu-item border-b border-dotted border-[var(--border)] pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="font-semibold text-[var(--text)]">
                      {item.name}
                      {item.soldOut ? (
                        <span className="ml-2 text-xs font-normal uppercase tracking-wide text-[var(--accent)]">
                          Ask
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">
                      {truncateMenuDescription(item.description)}
                    </p>
                  ) : null}
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {item.sizes.map((s) => (
                      <li
                        key={s.key}
                        className="flex justify-between gap-4 border-b border-transparent sm:border-none"
                      >
                        <span className="text-[var(--text-muted)]">{s.label}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-[var(--text)]">
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

      <footer className="relative mt-10 border-t-2 border-[var(--gold)] pt-6 text-center text-xs text-[var(--text-muted)]">
        <p className="font-medium text-[var(--text)]">
          Order online:{" "}
          <span className="break-all text-[var(--primary)]">{siteUrl}/menu</span>
        </p>
        <p className="mt-1 font-medium text-[var(--text)]">
          Printable / shareable menu:{" "}
          <span className="break-all text-[var(--primary)]">
            {siteUrl}/takeout-menu
          </span>
        </p>
        <p className="mt-2">
          Prices and availability subject to change. Texas sales tax applies at checkout (
          {salesTaxPercentLabel()} in Cypress).
        </p>
      </footer>
    </div>
  );
}
