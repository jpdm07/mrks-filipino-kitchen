"use client";

import { PhilippineSun } from "@/components/PhilippineSun";
import {
  BC_FILIPINO_KITCHEN_CARD,
  BC_ONLINE_TRACKED,
  BC_ORDER_TRACKED,
  BC_RIGHT_HEADLINE,
  BC_SCAN_ARROW,
  BC_TAGLINE_LOCATION,
  BC_TAGLINE_MAIN,
  facebookCardLabel,
} from "@/components/business-card/business-card-copy";
import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { SITE } from "@/lib/config";
import { hrefWithHttps } from "@/lib/url-display";

const QR_SIZE = 55;

/** Navy modules on cream — matches print spec */
const QR_HEX = {
  dark: "#0E1D35",
  light: "#FBF6EC",
};

function MiniDivider({ className }: { className?: string }) {
  return (
    <div
      className={`flex w-full max-w-[120px] items-center justify-center gap-1 ${className ?? ""}`}
      aria-hidden
    >
      <span className="h-px flex-1 rounded-full bg-[color:var(--gold-muted)]" />
      <span className="shrink-0 leading-none text-[color:var(--gold)]">✦</span>
      <span className="h-px flex-1 rounded-full bg-[color:var(--gold-muted)]" />
    </div>
  );
}

/**
 * US business card 3.5×2 in @ 336×192 preview px — navy/cream two-panel layout with gold frames.
 */
export function BusinessCardFaceComposed({
  qrHref,
}: {
  qrHref: string | null;
}) {
  return (
    <div className="bc-card bc-card--rebrand relative box-border h-[192px] w-[336px] max-w-none shrink-0 shadow-[var(--shadow-lg)] print:h-[192px] print:w-[336px] print:max-w-none print:shadow-none">
      {/* Outer gold rule — inset 5px from trim */}
      <div
        className="pointer-events-none absolute inset-[5px] z-[36] rounded-[3px]"
        style={{
          borderWidth: "0.8pt",
          borderStyle: "solid",
          borderColor: "var(--gold-muted)",
        }}
      />
      {/* Inner gold rule — inset 9px from trim */}
      <div
        className="pointer-events-none absolute inset-[9px] z-[36] rounded-[2px]"
        style={{
          borderWidth: "0.3pt",
          borderStyle: "solid",
          borderColor: "var(--gold-muted)",
        }}
      />

      {/* Content inset ~10px inside trim — sits under frames */}
      <div className="absolute inset-[10px] z-[25] flex flex-row overflow-hidden rounded-[1px]">
        {/* Left ~44% navy */}
        <div className="flex h-full w-[44%] shrink-0 flex-col items-center justify-center bg-[color:var(--primary)] px-2 py-3 text-center">
          <PhilippineSun size={22} color="var(--gold)" decorative />
          <p
            className="mt-2 font-dancing font-bold leading-none text-[color:var(--gold)]"
            style={{ fontSize: "26pt" }}
          >
            Mr. K&apos;s
          </p>
          <div className="mt-2 w-full px-1">
            <MiniDivider />
          </div>
          <p
            className="mt-2 font-playfair font-bold uppercase leading-snug text-[color:var(--cream)]"
            style={{ fontSize: "7pt", letterSpacing: "2px" }}
          >
            {BC_FILIPINO_KITCHEN_CARD}
          </p>
          <p
            className="mt-2 font-cormorant font-medium italic leading-snug text-[color:var(--cream)]"
            style={{ fontSize: "7pt" }}
          >
            {BC_TAGLINE_MAIN}
            <br />
            {BC_TAGLINE_LOCATION}
          </p>
        </div>

        {/* Vertical divider */}
        <div
          className="h-full w-px shrink-0 bg-[color:var(--gold-muted)]"
          style={{ width: "0.8pt" }}
          aria-hidden
        />

        {/* Right ~56% cream */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[color:var(--cream)] px-2.5 pb-2 pt-2">
          <div className="min-w-0 border-b border-[color:var(--gold-muted)] pb-1.5">
            <p
              className="font-playfair font-bold uppercase leading-tight text-[color:var(--gold-dark)]"
              style={{ fontSize: "7pt", letterSpacing: "1.2px" }}
            >
              {BC_RIGHT_HEADLINE}
            </p>
          </div>

          <div className="mt-1.5 flex min-h-0 flex-1 flex-col gap-0.5 text-left">
            <a
              href={SITE.phoneTel}
              className="font-playfair font-bold leading-none text-[color:var(--primary)] hover:opacity-90"
              style={{ fontSize: "8.5pt" }}
            >
              {SITE.phoneDisplay}
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="break-all font-cormorant leading-snug text-[color:var(--text)] hover:text-[color:var(--primary)]"
              style={{ fontSize: "7.5pt" }}
            >
              {SITE.email}
            </a>
            <p
              className="font-cormorant leading-snug text-[color:var(--text)]"
              style={{ fontSize: "7.5pt" }}
            >
              {SITE.location}
            </p>
            <a
              href={hrefWithHttps(SITE.facebookUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 flex max-w-full flex-nowrap items-start gap-1 font-cormorant italic leading-snug text-[color:var(--gold-dark)] hover:text-[color:var(--primary)]"
              style={{ fontSize: "7.5pt" }}
            >
              <FacebookIcon size={11} className="mt-0.5 shrink-0 text-[#1877F2]" />
              <span className="min-w-0">{facebookCardLabel()}</span>
            </a>
          </div>

          <div className="mt-auto flex flex-row items-end justify-between gap-2 pt-1">
            <p
              className="min-w-0 max-w-[52%] shrink font-playfair font-bold uppercase leading-tight text-[color:var(--gold-dark)]"
              style={{ fontSize: "5.5pt", letterSpacing: "1.2px" }}
            >
              {BC_ORDER_TRACKED} / {BC_ONLINE_TRACKED} / {BC_SCAN_ARROW}
            </p>
            <div className="flex shrink-0 flex-col items-center">
              {qrHref ? (
                <QRCodeDisplay
                  size={QR_SIZE}
                  resolutionScale={4}
                  showDownload={false}
                  href={qrHref}
                  qrDark={QR_HEX.dark}
                  qrLight={QR_HEX.light}
                  className="gap-0"
                />
              ) : (
                <div
                  className="rounded-sm bg-[color:var(--cream-deep)]"
                  style={{ width: QR_SIZE, height: QR_SIZE }}
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
