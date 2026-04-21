"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  absoluteBusinessCardFaceUrl,
  BC_ART_QR_BOTTOM_PX,
  BC_ART_QR_RIGHT_PX,
  BC_ART_QR_SIZE_PX,
  BUSINESS_CARD_FACE_SRC,
} from "@/lib/business-card-artwork";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { BusinessCardFaceComposed } from "@/components/business-card/BusinessCardFaceComposed";

const artworkIsRemoteHttp =
  typeof BUSINESS_CARD_FACE_SRC === "string" &&
  (BUSINESS_CARD_FACE_SRC.startsWith("http://") ||
    BUSINESS_CARD_FACE_SRC.startsWith("https://"));

function CardFaceArtwork({
  qrHref,
}: {
  qrHref: string | null;
}) {
  return (
    <div className="bc-card bc-card--artwork relative box-border h-[192px] w-[336px] max-w-none shrink-0 overflow-hidden bg-white shadow-[var(--shadow-lg)] print:h-[192px] print:w-[336px] print:max-w-none print:border-0 print:shadow-none">
      {artworkIsRemoteHttp ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote URL may not be in next.config images
        <img
          src={BUSINESS_CARD_FACE_SRC}
          alt=""
          width={336}
          height={192}
          className="pointer-events-none h-full w-full object-cover object-left"
        />
      ) : (
        <Image
          src={BUSINESS_CARD_FACE_SRC}
          alt=""
          width={336}
          height={192}
          className="pointer-events-none h-full w-full object-cover object-left"
          priority
          quality={100}
        />
      )}
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

export function BusinessCardFace({ qrHref }: { qrHref: string | null }) {
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
    return <CardFaceArtwork qrHref={qrHref} />;
  }

  return <BusinessCardFaceComposed qrHref={qrHref} />;
}
