"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  pdf,
  Link,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { SITE } from "@/lib/config";
import { hrefWithHttps } from "@/lib/url-display";
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
import {
  absoluteBusinessCardFaceUrl,
  BC_ART_QR_BOTTOM_PX,
  BC_ART_QR_RIGHT_PX,
  BC_ART_QR_SIZE_PX,
} from "@/lib/business-card-artwork";

const PT = 72;
const CARD_W = 3.5 * PT;
const CARD_H = 2 * PT;
const CARD_BORDER = 2;
/** Inset content box inside the blue border */
const INNER_W = CARD_W - 2 * CARD_BORDER;
const INNER_H = CARD_H - 2 * CARD_BORDER;
const INNER_HALF = INNER_W / 2;
const GAP = 0.125 * PT;

/** Map screen px from 336px-wide card design → PDF points (3.5" = CARD_W) */
const PX = (n: number) => (n * CARD_W) / 336;

/** Facebook “f” mark (matches site `FacebookIcon` path, print scale). */
function FacebookMarkPdf({ size = 6 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="#1877F2"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  grid: {
    flexDirection: "column",
    gap: GAP,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    gap: GAP,
  },
  cardOuter: {
    width: CARD_W,
    height: CARD_H,
    borderWidth: CARD_BORDER,
    borderColor: "#0038a8",
    borderStyle: "solid",
    borderRadius: 0,
  },
  /** Full-bleed exported proof — no vector border */
  cardArtOuter: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 0,
  },
  cardArtInner: {
    width: CARD_W,
    height: CARD_H,
    position: "relative",
  },
  cardArtFill: {
    width: CARD_W,
    height: CARD_H,
    objectFit: "cover",
  },
  qrArtOverlay: {
    position: "absolute",
    right: PX(BC_ART_QR_RIGHT_PX),
    bottom: PX(BC_ART_QR_BOTTOM_PX),
    width: PX(BC_ART_QR_SIZE_PX),
    height: PX(BC_ART_QR_SIZE_PX),
  },
  cardInner: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    borderRadius: 0,
  },
  brandWrap: {
    flex: 1,
    height: "100%",
    position: "relative",
  },
  brandTextWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: PX(8),
    paddingBottom: PX(8),
    paddingLeft: PX(12),
    paddingRight: PX(12),
  },
  brandMrKsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 2,
  },
  brandMrKs: {
    fontSize: PX(13),
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  brandSpark: {
    fontSize: PX(14),
    fontFamily: "Helvetica-Bold",
    color: "#FFC200",
    marginTop: -PX(3),
  },
  brandTrackedFilipino: {
    fontSize: PX(6),
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    color: "#e8b923",
    textAlign: "center",
    marginTop: PX(8),
    lineHeight: 1.35,
  },
  brandFoodTagline: {
    fontSize: PX(7),
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    color: "#e8b923",
    textAlign: "center",
    marginTop: PX(10),
    lineHeight: 1.25,
  },
  brandLine2: {
    fontSize: PX(6.5),
    color: "#ffffff",
    textAlign: "center",
    marginTop: PX(8),
  },
  rightCol: {
    flex: 1,
    height: "100%",
    paddingTop: PX(8),
    paddingBottom: PX(8),
    paddingLeft: PX(10),
    paddingRight: PX(10),
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
  },
  legalLine: {
    fontSize: PX(5.25),
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    color: "#0038a8",
    textAlign: "left",
    lineHeight: 1.25,
  },
  legalLineGap: {
    marginTop: PX(2),
  },
  contact: {
    fontSize: PX(8),
    color: "#14121a",
    marginTop: PX(6),
    fontWeight: "bold",
  },
  contactMuted: {
    fontSize: PX(7.5),
    color: "#5c5866",
    marginTop: PX(1),
  },
  fbRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    marginTop: 2,
    gap: 2,
    overflow: "hidden",
  },
  fbCardLabel: {
    fontSize: PX(6.25),
    color: "#14121a",
    lineHeight: 1.15,
    flex: 1,
    minWidth: 0,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: PX(4),
    paddingTop: PX(6),
    borderTopWidth: 1,
    borderTopColor: "#e5dfd3",
    borderTopStyle: "solid",
    gap: PX(8),
  },
  orderStack: {
    flexDirection: "column",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  orderTrackedFirst: {
    fontSize: PX(6),
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    color: "#ce1126",
    textAlign: "left",
    letterSpacing: 1,
    lineHeight: 1,
  },
  orderTrackedNext: {
    fontSize: PX(6),
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    color: "#ce1126",
    marginTop: PX(3),
    textAlign: "left",
    letterSpacing: 1,
    lineHeight: 1,
  },
  scanHint: {
    fontSize: PX(6.5),
    fontFamily: "Helvetica",
    color: "#5c5866",
    marginTop: PX(6),
    textAlign: "left",
    lineHeight: 1,
  },
  qrCol: {
    width: PX(52),
    flexShrink: 0,
    alignItems: "center",
  },
});

function BrandPanel({ gradientId }: { gradientId: string }) {
  const idLin = `${gradientId}-lin`;
  const idRed = `${gradientId}-red`;
  const idGold = `${gradientId}-gold`;
  return (
    <View style={styles.brandWrap}>
      <Svg
        width={INNER_HALF}
        height={INNER_H}
        viewBox={`0 0 ${INNER_HALF} ${INNER_H}`}
      >
        <Defs>
          {/*
            Match `brandPanelStyle` on BusinessCardSheet: linear + two radial overlays
            (crimson top-right, gold bottom-left).
          */}
          <LinearGradient id={idLin} x1="0%" y1="100%" x2="92%" y2="6%">
            <Stop offset="0" stopColor="#06153d" />
            <Stop offset="0.26" stopColor="#0c3488" />
            <Stop offset="0.5" stopColor="#0038a8" />
            <Stop offset="0.74" stopColor="#5a1836" />
            <Stop offset="0.88" stopColor="#7a1428" />
            <Stop offset="1" stopColor="#f2e6a8" />
          </LinearGradient>
          <RadialGradient id={idRed} cx="100%" cy="4%" r="72%">
            <Stop offset="0" stopColor="#ce1126" stopOpacity={0.5} />
            <Stop offset="0.5" stopColor="#ce1126" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#ce1126" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={idGold} cx="2%" cy="96%" r="68%">
            <Stop offset="0" stopColor="#ffecb4" stopOpacity={0.5} />
            <Stop offset="0.48" stopColor="#ffecb4" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#ffecb4" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={INNER_HALF} height={INNER_H} fill={`url(#${idLin})`} />
        <Rect x="0" y="0" width={INNER_HALF} height={INNER_H} fill={`url(#${idGold})`} />
        <Rect x="0" y="0" width={INNER_HALF} height={INNER_H} fill={`url(#${idRed})`} />
      </Svg>
      <View style={styles.brandTextWrap}>
        <View style={styles.brandMrKsRow}>
          <Text style={styles.brandMrKs}>Mr. K&apos;s</Text>
          <Text style={styles.brandSpark}>✦</Text>
        </View>
        <Text style={styles.brandTrackedFilipino}>{BC_FILIPINO_KITCHEN_TRACKED}</Text>
        <Text style={styles.brandFoodTagline}>{BC_BRAND_TAGLINE}</Text>
        <Text style={styles.brandLine2}>Cypress, TX · Pickup only</Text>
      </View>
    </View>
  );
}

function SingleCardArtwork({
  qrSrc,
  faceImageSrc,
}: {
  qrSrc: string;
  faceImageSrc: string;
}) {
  return (
    <View style={styles.cardArtOuter}>
      <View style={styles.cardArtInner}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt */}
        <Image src={faceImageSrc} style={styles.cardArtFill} />
        <View style={styles.qrArtOverlay}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt */}
          <Image
            src={qrSrc}
            style={{
              width: PX(BC_ART_QR_SIZE_PX),
              height: PX(BC_ART_QR_SIZE_PX),
            }}
          />
        </View>
      </View>
    </View>
  );
}

function SingleCard({
  qrSrc,
  index,
}: {
  qrSrc: string;
  index: number;
}) {
  const facebookHref = hrefWithHttps(SITE.facebookUrl);
  return (
    <View style={styles.cardOuter}>
      <View style={styles.cardInner}>
        <BrandPanel gradientId={`bc-grad-${index}`} />
        <View style={styles.rightCol}>
          <View>
            <Text style={styles.legalLine}>{BC_LEGAL_HEADLINE_LINE1}</Text>
            <Text style={[styles.legalLine, styles.legalLineGap]}>
              {BC_LEGAL_HEADLINE_LINE2}
            </Text>
            <Text style={styles.contact}>{SITE.phoneDisplay}</Text>
            <Text style={styles.contactMuted}>{SITE.email}</Text>
            <Text style={styles.contactMuted}>{SITE.location}</Text>
            <Link src={facebookHref}>
              <View style={styles.fbRow}>
                <FacebookMarkPdf size={PX(11)} />
                <Text style={styles.fbCardLabel} wrap={false}>
                  {facebookCardLabel()}
                </Text>
              </View>
            </Link>
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.orderStack}>
              <Text style={styles.orderTrackedFirst}>{BC_ORDER_TRACKED}</Text>
              <Text style={styles.orderTrackedNext}>{BC_ONLINE_TRACKED}</Text>
              <Text style={styles.scanHint}>{BC_SCAN_ARROW}</Text>
            </View>
            <View style={styles.qrCol}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt */}
              <Image
                src={qrSrc}
                style={{ width: PX(46), height: PX(46) }}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function BusinessCardPdfDocument({
  qrSrc,
  faceImageSrc,
}: {
  qrSrc: string;
  faceImageSrc?: string | null;
}) {
  const useArtwork = Boolean(faceImageSrc);
  const rows = [0, 1, 2, 3].map((r) => (
    <View key={r} style={styles.row}>
      {useArtwork && faceImageSrc
        ? [
            <SingleCardArtwork
              key={`${r}-a`}
              qrSrc={qrSrc}
              faceImageSrc={faceImageSrc}
            />,
            <SingleCardArtwork
              key={`${r}-b`}
              qrSrc={qrSrc}
              faceImageSrc={faceImageSrc}
            />,
          ]
        : [
            <SingleCard key={`${r}-a`} qrSrc={qrSrc} index={r * 2} />,
            <SingleCard key={`${r}-b`} qrSrc={qrSrc} index={r * 2 + 1} />,
          ]}
    </View>
  ));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.grid}>{rows}</View>
      </Page>
    </Document>
  );
}

async function resolveFaceImageUrlForPdf(): Promise<string | null> {
  const url = absoluteBusinessCardFaceUrl();
  if (!url) return null;
  try {
    const head = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (head.ok) return url;
  } catch {
    /* fall through */
  }
  try {
    const get = await fetch(url, { method: "GET", cache: "no-store" });
    if (get.ok) return url;
  } catch {
    /* ignore */
  }
  return null;
}

export async function buildBusinessCardsPdfBlob(qrUrl: string): Promise<Blob> {
  const qrSrc = await QRCode.toDataURL(qrUrl, {
    width: 280,
    margin: 1,
    color: { dark: "#0038a8", light: "#ffffff" },
  });
  const faceImageSrc = await resolveFaceImageUrlForPdf();
  return pdf(
    <BusinessCardPdfDocument qrSrc={qrSrc} faceImageSrc={faceImageSrc} />
  ).toBlob();
}
