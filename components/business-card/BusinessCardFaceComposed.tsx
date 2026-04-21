"use client";

import type { CSSProperties } from "react";
import {
  BC_BRAND_TAGLINE,
  BC_FILIPINO_KITCHEN_TRACKED,
  BC_LEGAL_HEADLINE_LINE1,
  BC_LEGAL_HEADLINE_LINE2,
  BC_ONLINE_TRACKED,
  BC_ORDER_TRACKED,
  BC_SCAN_ARROW,
  facebookCardLabel,
} from "@/components/business-card/business-card-copy";
import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { SITE } from "@/lib/config";
import { hrefWithHttps } from "@/lib/url-display";

/** Deep blue + crimson; lighter gold “sun” corner for inkjet print */
const brandPanelStyle: CSSProperties = {
  background: `
    radial-gradient(ellipse 120% 72% at 100% 4%, rgba(206, 17, 38, 0.55), transparent 54%),
    radial-gradient(ellipse 88% 65% at 2% 96%, rgba(255, 236, 180, 0.55), transparent 52%),
    linear-gradient(152deg, #06153d 0%, #0c3488 26%, #0038a8 50%, #5a1836 74%, #7a1428 88%, #f2e6a8 100%)
  `,
};

/** Fallback when `public/images/mrks-business-card-face.png` is missing — HTML approximation only. */
export function BusinessCardFaceComposed({
  qrHref,
}: {
  qrHref: string | null;
}) {
  return (
    <div className="bc-card bc-card--composed box-border h-[192px] w-[336px] max-w-none shrink-0 border-2 border-[var(--primary)] bg-white shadow-[var(--shadow-lg)] print:h-[192px] print:w-[336px] print:max-w-none print:shadow-none">
      <div className="bc-card-inner flex h-full min-h-0 w-full flex-row overflow-hidden">
        <div
          className="flex w-[min(50%,168px)] shrink-0 flex-col items-center justify-center px-3 py-3 print:border-0"
          style={brandPanelStyle}
        >
          <div className="flex flex-col items-center text-center px-1">
            <p className="flex flex-wrap items-baseline justify-center gap-px font-[family-name:var(--font-playfair)] text-[13px] font-bold leading-none tracking-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
              Mr. K&apos;s
              <span className="translate-y-px text-[14px] leading-none text-[var(--gold)]" aria-hidden>
                ✦
              </span>
            </p>
            <p className="mt-2 max-w-[156px] font-[family-name:var(--font-playfair)] text-[6.5px] font-bold leading-snug tracking-[0.08em] text-[var(--gold)] [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              {BC_FILIPINO_KITCHEN_TRACKED}
            </p>
            <p className="mt-2.5 max-w-[154px] font-[family-name:var(--font-playfair)] text-[7px] font-semibold leading-snug text-[var(--gold)] [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              {BC_BRAND_TAGLINE}
            </p>
            <p className="mt-2.5 text-[6.5px] font-medium leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
              Cypress, TX · Pickup only
            </p>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-2.5 py-2">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch text-left text-[8px] leading-snug text-[var(--text)]">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-playfair)] text-[8px] font-bold leading-[1.15] text-[var(--primary)]">
                {BC_LEGAL_HEADLINE_LINE1}
              </p>
              <p className="font-[family-name:var(--font-playfair)] text-[8px] font-bold leading-[1.15] text-[var(--primary)]">
                {BC_LEGAL_HEADLINE_LINE2}
              </p>
            </div>
            <a
              href={SITE.phoneTel}
              className="mt-1 block font-bold text-[var(--text)] hover:text-[var(--primary)]"
            >
              {SITE.phoneDisplay}
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="block break-all text-[7.5px] text-[var(--text-muted)] hover:text-[var(--primary)]"
            >
              {SITE.email}
            </a>
            <p className="text-[7.5px] text-[var(--text-muted)]">{SITE.location}</p>
            <a
              href={hrefWithHttps(SITE.facebookUrl)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook profile"
              className="mt-1 flex min-w-0 max-w-full flex-nowrap items-start gap-1"
            >
              <FacebookIcon size={11} className="mt-0.5 shrink-0 text-[#1877F2]" />
              <span className="min-w-0 flex-1 text-[6.5px] font-semibold leading-snug text-[var(--text)]">
                {facebookCardLabel()}
              </span>
            </a>
          </div>

          <div className="mt-auto flex shrink-0 flex-row items-end justify-between gap-2 border-t border-[var(--border)] pt-1.5">
            <div className="flex min-w-0 flex-1 flex-col items-start justify-end pb-0.5">
              <p className="font-[family-name:var(--font-playfair)] text-[6px] font-bold leading-none tracking-[0.14em] text-[var(--accent)]">
                {BC_ORDER_TRACKED}
              </p>
              <p className="mt-0.5 font-[family-name:var(--font-playfair)] text-[6px] font-bold leading-none tracking-[0.14em] text-[var(--accent)]">
                {BC_ONLINE_TRACKED}
              </p>
              <p className="mt-1 text-[6.5px] font-medium leading-none text-[var(--text-muted)]">
                {BC_SCAN_ARROW}
              </p>
            </div>
            <div className="flex w-[52px] shrink-0 flex-col items-center">
              {qrHref ? (
                <QRCodeDisplay
                  size={46}
                  resolutionScale={4}
                  showDownload={false}
                  href={qrHref}
                  className="gap-0"
                />
              ) : (
                <div
                  className="rounded-sm bg-[var(--bg-section)]"
                  style={{ width: 46, height: 46 }}
                  aria-hidden
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
