"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  absoluteBusinessCardFaceUrl,
  BC_ART_QR_BOTTOM_PX,
  BC_ART_QR_RIGHT_PX,
  BC_ART_QR_SIZE_PX,
  BUSINESS_CARD_FACE_SRC,
} from "@/lib/business-card-artwork";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { BusinessCardFaceComposed } from "@/components/business-card/BusinessCardFaceComposed";

function CardFaceArtwork({
  qrHref,
  onVisualReady,
}: {
  qrHref: string | null;
  /** Fires when the face image has painted (incl. cached). For html-to-image / PDF. */
  onVisualReady?: () => void;
}) {
  const doneRef = useRef(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const fireReady = useCallback(() => {
    if (!onVisualReady || doneRef.current) return;
    doneRef.current = true;
    void document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => onVisualReady());
      });
    });
  }, [onVisualReady]);

  useLayoutEffect(() => {
    if (!onVisualReady) return;
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) fireReady();
  }, [onVisualReady, fireReady]);

  return (
    <div className="bc-card bc-card--artwork relative box-border h-[192px] w-[336px] max-w-none shrink-0 overflow-hidden bg-white shadow-[var(--shadow-lg)] print:h-[192px] print:w-[336px] print:max-w-none print:border-0 print:shadow-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- canvas PDF capture needs native <img> (not next/image). */}
      <img
        ref={imgRef}
        src={BUSINESS_CARD_FACE_SRC}
        alt="Mr. K's Filipino Kitchen logo Cypress TX"
        width={336}
        height={192}
        className="pointer-events-none h-full w-full object-cover object-left"
        onLoad={onVisualReady ? fireReady : undefined}
        onError={onVisualReady ? fireReady : undefined}
      />
      <div
        className="absolute flex items-center justify-center"
        style={{
          right: BC_ART_QR_RIGHT_PX,
          bottom: BC_ART_QR_BOTTOM_PX,
          width: BC_ART_QR_SIZE_PX,
          height: BC_ART_QR_SIZE_PX,
        }}
      >
        {qrHref ? (
          <QRCodeDisplay
            size={BC_ART_QR_SIZE_PX}
            resolutionScale={4}
            showDownload={false}
            href={qrHref}
            qrDark="#0E1D35"
            qrLight="#FBF6EC"
            className="gap-0"
          />
        ) : (
          <div
            className="rounded-sm bg-white/90"
            style={{ width: BC_ART_QR_SIZE_PX, height: BC_ART_QR_SIZE_PX }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

export function BusinessCardFace({
  qrHref,
  onReady,
}: {
  qrHref: string | null;
  /** When set (PDF capture clone only), fires after the card bitmap/fonts/QR are safe to rasterize. */
  onReady?: () => void;
}) {
  const [resolved, setResolved] = useState(false);
  const [useArtwork, setUseArtwork] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = absoluteBusinessCardFaceUrl();
        if (!url) {
          if (!cancelled) {
            setUseArtwork(false);
            setResolved(true);
          }
          return;
        }
        const r = await fetch(url, { method: "HEAD", cache: "no-store" });
        if (!cancelled) {
          setUseArtwork(r.ok);
          setResolved(true);
        }
      } catch {
        if (!cancelled) {
          setUseArtwork(false);
          setResolved(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!resolved) {
    return (
      <div
        className="box-border h-[192px] w-[336px] max-w-none shrink-0 animate-pulse rounded-sm bg-[var(--bg-section)]"
        aria-hidden
      />
    );
  }

  if (useArtwork) {
    return (
      <CardFaceArtwork
        qrHref={qrHref}
        onVisualReady={onReady}
      />
    );
  }

  return (
    <BusinessCardFaceComposed qrHref={qrHref} onVisualReady={onReady} />
  );
}
