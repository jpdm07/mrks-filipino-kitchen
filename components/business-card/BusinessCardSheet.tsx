"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { BusinessCardFace } from "@/components/business-card/BusinessCardFace";
import { getBusinessCardQrUrl } from "@/lib/business-card-qr";

/** 8 cards per US Letter sheet: 2 × 4 @ 3.5" × 2" with trim gaps */
const CARDS_PER_SHEET = 8;

/** Preview / print layout at 96 CSS px per inch — matches physical 3.5" × 2" cards */
const PREVIEW_CARD_PX_W = 336;

export function BusinessCardSheet({
  showPrintButton = true,
}: {
  showPrintButton?: boolean;
}) {
  const [qrHref, setQrHref] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  /** Screen-only: scale the on-page preview on narrow viewports. PDF + print sheet unchanged (preview is print:hidden). */
  useLayoutEffect(() => {
    const sync = () => {
      if (typeof window === "undefined") return;
      const narrow = window.matchMedia("(max-width: 639px)").matches;
      if (!narrow) {
        setPreviewScale(1);
        return;
      }
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const horizontalGutterPx = 40;
      const available = Math.min(
        PREVIEW_CARD_PX_W,
        Math.max(0, vw - horizontalGutterPx)
      );
      setPreviewScale(Math.min(1, available / PREVIEW_CARD_PX_W));
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    const mq = window.matchMedia("(max-width: 639px)");
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      mq.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    setQrHref(getBusinessCardQrUrl());
  }, []);

  const downloadPdf = useCallback(async () => {
    if (!qrHref || pdfBusy) return;
    setPdfBusy(true);
    try {
      const { buildBusinessCardsPdfBlob } = await import(
        "./BusinessCardPdfDocument"
      );
      const blob = await buildBusinessCardsPdfBlob(qrHref);
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
  }, [qrHref, pdfBusy]);

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
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-area .bc-print-sheet .bc-card--rebrand {
            border: none !important;
          }
          #print-area .bc-print-sheet .bc-card--artwork {
            border: none !important;
          }
          #print-area .bc-print-sheet .bc-print-cut-r {
            border-right: 1px dashed rgba(90, 90, 90, 0.55) !important;
          }
          #print-area .bc-print-sheet .bc-print-cut-b {
            border-bottom: 1px dashed rgba(90, 90, 90, 0.55) !important;
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
              className="rounded-lg bg-[var(--gold)] px-6 py-3 font-bold text-[color:var(--primary)] shadow-md transition enabled:hover:brightness-95 disabled:opacity-60"
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
        className="flex w-full min-w-0 flex-col items-center print:block print:text-left"
      >
        <div className="bc-preview mx-auto w-full max-w-[min(100vw,22rem)] px-3 py-4 sm:max-w-[336px] sm:px-0 sm:py-0">
          {/*
            Center with text-align + inline-block so transform scale keeps the card centered.
            No overflow:hidden (shadow was clipped); body overflow-x-clip is overridden on this page.
          */}
          <div className="print:hidden w-full text-center">
            <div
              className="inline-block overflow-visible align-top"
              style={
                previewScale < 0.999
                  ? {
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top center",
                    }
                  : undefined
              }
            >
              <BusinessCardFace qrHref={qrHref} />
            </div>
          </div>
        </div>

        <div className="bc-print-sheet hidden" aria-hidden>
          {Array.from({ length: CARDS_PER_SHEET }, (_, i) => (
            <div
              key={i}
              className={`bc-print-cell ${i % 2 === 0 ? "bc-print-cut-r" : ""} ${Math.floor(i / 2) < 3 ? "bc-print-cut-b" : ""}`}
            >
              <BusinessCardFace qrHref={qrHref} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
