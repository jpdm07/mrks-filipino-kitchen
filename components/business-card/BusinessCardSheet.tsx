"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { Logo } from "@/components/ui/Logo";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { SITE } from "@/lib/config";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { hrefWithHttps } from "@/lib/url-display";

/** 8 cards per US Letter sheet: 2 × 4 @ 3.5" × 2" with trim gaps */
const CARDS_PER_SHEET = 8;

/** Modern mesh ombre: deep blue base, crimson glow, warm gold corner (flag-inspired, print-safe) */
const brandPanelStyle: CSSProperties = {
  background: `
    radial-gradient(ellipse 120% 72% at 100% 4%, rgba(206, 17, 38, 0.7), transparent 54%),
    radial-gradient(ellipse 88% 65% at 2% 96%, rgba(255, 214, 102, 0.45), transparent 52%),
    linear-gradient(152deg, #06153d 0%, #0c3488 26%, #0038a8 50%, #5a1836 74%, #7a1428 88%, #c9a227 100%)
  `,
};

function BusinessCardFace({
  orderQrHref,
  siteBaseUrl,
}: {
  orderQrHref: string | null;
  siteBaseUrl: string | null;
}) {
  return (
    <div className="bc-card box-border h-[192px] w-[336px] rounded-xl border-2 border-[var(--primary)] bg-white shadow-[var(--shadow-lg)] print:rounded-xl print:shadow-none">
      {/*
        Border on outer only; inner clips content. Same-element overflow-hidden + rounded border
        often clips the blue stroke at the corners (especially in print/PDF).
      */}
      <div className="bc-card-inner flex h-full min-h-0 w-full flex-row overflow-hidden rounded-[10px] print:rounded-[10px]">
        <div
          className="flex w-[min(50%,168px)] shrink-0 flex-col items-center justify-center px-3 py-3 print:border-0"
          style={brandPanelStyle}
        >
          <div className="flex flex-col items-center text-center">
            <Logo size="sm" light />
            <p className="mt-2 max-w-[140px] font-[family-name:var(--font-playfair)] text-[7px] font-bold uppercase leading-tight tracking-[0.12em] text-[var(--gold)] [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              Authentic Filipino Kitchen
            </p>
            <p className="mt-1 text-[6.5px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
              Cypress, TX · Pickup only
            </p>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-2.5 py-2">
        <div className="min-w-0 flex-1 space-y-0.5 text-[8px] leading-snug text-[var(--text)]">
          <p className="font-[family-name:var(--font-playfair)] text-[13px] font-bold leading-none text-[var(--primary)]">
            {SITE.name}
          </p>
          <a
            href={SITE.phoneTel}
            className="block font-bold text-[var(--text)] hover:text-[var(--primary)]"
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
          {siteBaseUrl ? (
            <p className="text-[5px] leading-tight text-[var(--text-muted)] whitespace-nowrap">
              <span className="font-semibold text-[var(--text)]">Website: </span>
              {hrefWithHttps(siteBaseUrl)}
            </p>
          ) : null}
          <a
            href={SITE.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[7.5px] font-semibold text-[#1877F2]"
          >
            <FacebookIcon size={12} />
            Facebook
          </a>
          <p className="text-[5px] leading-tight text-[var(--text-muted)] break-all">
            {hrefWithHttps(SITE.facebookUrl)}
          </p>
        </div>

        <div className="mt-1 flex shrink-0 items-start gap-3 border-t border-[var(--border)] pt-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-[6.5px] font-bold uppercase leading-tight tracking-wide text-[var(--accent)]">
              Order online
            </p>
            {orderQrHref ? (
              <p className="mt-1 text-[5px] leading-tight text-[var(--text-muted)] whitespace-nowrap">
                Can&apos;t scan?{" "}
                <span className="font-semibold text-[var(--text)]">
                  {hrefWithHttps(orderQrHref)}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex w-[52px] shrink-0 flex-col items-center">
            {orderQrHref ? (
              <QRCodeDisplay
                size={46}
                resolutionScale={4}
                showDownload={false}
                href={orderQrHref}
                className="gap-0"
              />
            ) : (
              <div
                className="rounded-sm bg-[var(--bg-section)]"
                style={{ width: 46, height: 46 }}
                aria-hidden
              />
            )}
            <span className="mt-0.5 text-[6px] font-bold text-[var(--text-muted)]">
              Scan
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export function BusinessCardSheet({
  showPrintButton = true,
}: {
  showPrintButton?: boolean;
}) {
  const [orderQrHref, setOrderQrHref] = useState<string | null>(null);
  const [siteBaseUrl, setSiteBaseUrl] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const base = getPublicSiteOrigin();
    setSiteBaseUrl(base);
    setOrderQrHref(`${base}/order`);
  }, []);

  const downloadPdf = useCallback(async () => {
    if (!orderQrHref || pdfBusy) return;
    setPdfBusy(true);
    try {
      const { buildBusinessCardsPdfBlob } = await import(
        "./BusinessCardPdfDocument"
      );
      const blob = await buildBusinessCardsPdfBlob(
        orderQrHref,
        siteBaseUrl ?? undefined
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mrks-business-cards.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setPdfBusy(false);
    }
  }, [orderQrHref, siteBaseUrl, pdfBusy]);

  return (
    <>
      <style jsx global>{`
        @media print {
          /* Generous margins for home inkjets (e.g. HP Envy 4500) — avoids clipped edges */
          @page {
            size: letter portrait;
            margin: 0.5in;
          }
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white;
          }
          #print-area .bc-preview {
            display: none !important;
          }
          #print-area .bc-print-sheet {
            display: grid !important;
            grid-template-columns: 3.5in 3.5in;
            grid-auto-rows: 2in;
            gap: 0.125in;
            justify-content: center;
            align-content: start;
            width: 100%;
          }
          #print-area .bc-print-sheet .bc-card {
            width: 3.5in !important;
            height: 2in !important;
            min-width: 3.5in !important;
            min-height: 2in !important;
            max-width: 3.5in !important;
            max-height: 2in !important;
            border-radius: 10px !important;
            box-shadow: none !important;
            border: 2px solid #0038a8 !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-area .bc-print-sheet .bc-card .bc-card-inner {
            overflow: hidden !important;
            border-radius: 8px !important;
          }
        }
      `}</style>
      {showPrintButton ? (
        <div className="mb-8 flex max-w-md flex-col items-center gap-4 print:hidden">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={pdfBusy}
              className="rounded-lg bg-[var(--gold)] px-6 py-3 font-bold text-[var(--text)] shadow-md transition enabled:hover:brightness-95 disabled:opacity-60"
            >
              {pdfBusy ? "Building PDF…" : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border-2 border-[var(--primary)] bg-white px-6 py-3 font-bold text-[var(--primary)] shadow-sm hover:bg-[var(--bg-section)]"
            >
              Print
            </button>
          </div>
          <p className="text-center text-sm leading-relaxed text-[var(--text-muted)]">
            <strong className="text-[var(--text)]">Download PDF</strong> builds the file directly
            (no print dialog) — best if &quot;Save as PDF&quot; doesn&apos;t show up.{" "}
            <strong className="text-[var(--text)]">Print</strong> is for your HP or another physical
            printer.
          </p>
          <p className="text-center text-sm leading-relaxed text-[var(--text-muted)]">
            For the print dialog: open the <strong className="text-[var(--text)]">destination</strong>{" "}
            dropdown and pick <strong className="text-[var(--text)]">Save as PDF</strong> or{" "}
            <strong className="text-[var(--text)]">Microsoft Print to PDF</strong>. Use{" "}
            <strong className="text-[var(--text)]">100%</strong> scale.
          </p>
        </div>
      ) : null}
      <div
        id="print-area"
        className="flex flex-col items-center print:block print:text-left"
      >
        <div className="bc-preview flex flex-col items-center">
          <BusinessCardFace orderQrHref={orderQrHref} siteBaseUrl={siteBaseUrl} />
        </div>

        <div className="bc-print-sheet hidden" aria-hidden>
          {Array.from({ length: CARDS_PER_SHEET }, (_, i) => (
            <BusinessCardFace
              key={i}
              orderQrHref={orderQrHref}
              siteBaseUrl={siteBaseUrl}
            />
          ))}
        </div>
      </div>
    </>
  );
}
