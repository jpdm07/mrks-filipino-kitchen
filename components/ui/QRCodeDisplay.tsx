"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

export function QRCodeDisplay({
  size = 120,
  className = "",
  showDownload = true,
  /** Canvas pixel multiplier for sharper output when scaled (e.g. print). Visual CSS size stays `size`. */
  resolutionScale = 1,
  /** Full URL to encode; defaults to public site origin (or current origin in the browser). */
  href,
}: {
  size?: number;
  className?: string;
  showDownload?: boolean;
  resolutionScale?: number;
  href?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState(() => getPublicSiteOrigin());

  useEffect(() => {
    if (href) {
      setUrl(href);
      return;
    }
    setUrl(getPublicSiteOrigin());
  }, [href]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const px = Math.round(size * resolutionScale);
    QRCode.toCanvas(canvas, url, {
      width: px,
      margin: 1,
      color: { dark: "#0038A8", light: "#ffffff" },
    }).catch(() => {});
  }, [url, size, resolutionScale]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mrks-kitchen-qr.png";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  };

  return (
    <div className={`flex w-fit max-w-full flex-col items-center gap-2 ${className}`}>
      <div
        className="shrink-0 overflow-hidden rounded-sm leading-none"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full max-h-full max-w-full rounded-sm"
          style={{
            width: size,
            height: size,
            imageRendering: resolutionScale > 1 ? "crisp-edges" : undefined,
          }}
        />
      </div>
      {showDownload ? (
        <button
          type="button"
          onClick={download}
          className="text-xs font-semibold text-[var(--primary)] underline"
        >
          Download QR Code
        </button>
      ) : null}
    </div>
  );
}
