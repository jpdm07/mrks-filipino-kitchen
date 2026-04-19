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
  Circle,
  Line,
  G,
  pdf,
  Link,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { SITE } from "@/lib/config";
import { businessCardUrlDisplay, hrefWithHttps } from "@/lib/url-display";

const LOGO_WORDMARK_TITLE = "Mr. K\u2019s";

function siteBaseFromQrUrl(qrUrl: string): string {
  return qrUrl
    .trim()
    .replace(/\/?order\/?$/i, "")
    .replace(/\/+$/, "");
}

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

/** Same geometry as `Logo` size="sm" (light variant) */
const LOGO_SM = {
  w: 132,
  h: 52,
  sunCx: 66,
  sunCy: 12,
  sunOuter: 15,
  sunInner: 6,
  titleY: 28,
  titleFs: 15,
  lineY: 34,
  lineHalfW: 40,
  subY: 46,
  subFs: 6.5,
} as const;

function smLogoRayPaths(): string[] {
  const { sunCx: cx, sunCy: cy, sunOuter: outer, sunInner: inner } = LOGO_SM;
  const rays = 8;
  const rayPath: string[] = [];
  for (let i = 0; i < rays; i++) {
    const a1 = ((i - 0.35) / rays) * Math.PI * 2;
    const a2 = ((i + 0.35) / rays) * Math.PI * 2;
    const x1 = cx + Math.cos(a1) * inner;
    const y1 = cy + Math.sin(a1) * inner;
    const x2 = cx + Math.cos(a2) * inner;
    const y2 = cy + Math.sin(a2) * inner;
    const xo = cx + Math.cos((a1 + a2) / 2) * outer;
    const yo = cy + Math.sin((a1 + a2) / 2) * outer;
    rayPath.push(
      `M${x1.toFixed(1)},${y1.toFixed(1)} L${xo.toFixed(1)},${yo.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} Z`
    );
  }
  return rayPath;
}

const RAY_PATHS = smLogoRayPaths();

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

/** Renders the sun + wordmark like the site Logo (sm, light). */
function BrandLogoMarkPdf() {
  const L = LOGO_SM;
  return (
    <Svg width={118} height={46} viewBox={`0 0 ${L.w} ${L.h}`}>
      <G opacity={0.13}>
        {RAY_PATHS.map((d, i) => (
          <Path key={i} d={d} fill="#fff1c8" />
        ))}
        <Circle
          cx={L.sunCx}
          cy={L.sunCy}
          r={L.sunInner - 0.5}
          fill="#ffffff"
        />
      </G>
      <Text
        x={L.sunCx}
        y={L.titleY}
        style={{
          fontFamily: "Helvetica-Bold",
          fontSize: L.titleFs,
          fill: "#ffffff",
        }}
        textAnchor="middle"
      >
        {LOGO_WORDMARK_TITLE}
      </Text>
      <Line
        x1={L.sunCx - L.lineHalfW}
        y1={L.lineY}
        x2={L.sunCx + L.lineHalfW}
        y2={L.lineY}
        stroke="#FFC200"
        strokeWidth={1.35}
        strokeLinecap="round"
      />
      <Text
        x={L.sunCx}
        y={L.subY}
        style={{
          fontFamily: "Helvetica-Bold",
          fontSize: L.subFs,
          fill: "#e8b923",
          letterSpacing: 1.2,
        }}
        textAnchor="middle"
      >
        FILIPINO KITCHEN
      </Text>
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
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 3,
    paddingRight: 3,
  },
  brandLine1: {
    fontSize: PX(7),
    fontWeight: "bold",
    color: "#e8b923",
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: PX(2),
    letterSpacing: 0.4,
  },
  brandLine2: {
    fontSize: PX(6.5),
    color: "#ffffff",
    textAlign: "center",
    marginTop: PX(2),
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
  bizName: {
    fontSize: PX(13),
    fontWeight: "bold",
    color: "#0038a8",
  },
  contact: {
    fontSize: PX(8),
    color: "#14121a",
    marginTop: PX(2),
    fontWeight: "bold",
  },
  contactMuted: {
    fontSize: PX(7.5),
    color: "#5c5866",
    marginTop: PX(1),
  },
  /** “Website:” label (URL is sibling Text for one-line layout) */
  websiteLine: {
    fontSize: PX(7),
    color: "#14121a",
    fontWeight: "bold",
  },
  websiteUrlPart: {
    fontSize: PX(7),
    color: "#14121a",
    fontWeight: "normal",
  },
  fbRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    marginTop: 2,
    gap: 2,
    overflow: "hidden",
  },
  fbUrlText: {
    fontSize: PX(6),
    color: "#1877F2",
    lineHeight: 1.05,
    flex: 1,
    minWidth: 0,
    fontWeight: "bold",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    marginTop: PX(4),
    paddingTop: PX(6),
    borderTopWidth: 1,
    borderTopColor: "#e5dfd3",
    borderTopStyle: "solid",
  },
  orderLabel: {
    fontSize: PX(6),
    fontWeight: "bold",
    color: "#ce1126",
    textTransform: "uppercase",
    marginTop: PX(2),
    textAlign: "center",
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
          <LinearGradient id={idLin} x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#06153d" />
            <Stop offset="0.26" stopColor="#0c3488" />
            <Stop offset="0.5" stopColor="#0038a8" />
            <Stop offset="0.74" stopColor="#5a1836" />
            <Stop offset="0.88" stopColor="#7a1428" />
            <Stop offset="1" stopColor="#f2e6a8" />
          </LinearGradient>
          <RadialGradient id={idRed} cx="100%" cy="4%" r="68%">
            <Stop offset="0" stopColor="#ce1126" stopOpacity={0.55} />
            <Stop offset="0.54" stopColor="#ce1126" stopOpacity={0} />
            <Stop offset="1" stopColor="#ce1126" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={idGold} cx="2%" cy="96%" r="62%">
            <Stop offset="0" stopColor="#ffecb4" stopOpacity={0.55} />
            <Stop offset="0.52" stopColor="#ffecb4" stopOpacity={0} />
            <Stop offset="1" stopColor="#ffecb4" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={INNER_HALF} height={INNER_H} fill={`url(#${idLin})`} />
        <Rect x="0" y="0" width={INNER_HALF} height={INNER_H} fill={`url(#${idGold})`} />
        <Rect x="0" y="0" width={INNER_HALF} height={INNER_H} fill={`url(#${idRed})`} />
      </Svg>
      <View style={styles.brandTextWrap}>
        <BrandLogoMarkPdf />
        <Text style={styles.brandLine1}>Authentic Filipino Kitchen</Text>
        <Text style={styles.brandLine2}>Cypress, TX · Pickup only</Text>
      </View>
    </View>
  );
}

function SingleCard({
  qrSrc,
  qrUrl,
  siteBaseUrl,
  index,
}: {
  qrSrc: string;
  qrUrl: string;
  siteBaseUrl?: string;
  index: number;
}) {
  const websiteHref = hrefWithHttps(
    siteBaseUrl?.trim() || siteBaseFromQrUrl(qrUrl)
  );
  const websiteDisplay = businessCardUrlDisplay(websiteHref);
  const facebookHref = hrefWithHttps(SITE.facebookUrl);
  const facebookDisplay = businessCardUrlDisplay(SITE.facebookUrl);
  return (
    <View style={styles.cardOuter}>
      <View style={styles.cardInner}>
        <BrandPanel gradientId={`bc-grad-${index}`} />
        <View style={styles.rightCol}>
          <View>
            <Text style={styles.bizName}>{SITE.name}</Text>
            <Text style={styles.contact}>{SITE.phoneDisplay}</Text>
            <Text style={styles.contactMuted}>{SITE.email}</Text>
            <Text style={styles.contactMuted}>{SITE.location}</Text>
            <Link src={facebookHref}>
              <View style={styles.fbRow}>
                <FacebookMarkPdf size={PX(11)} />
                <Text style={styles.fbUrlText} wrap={false}>
                  {facebookDisplay}
                </Text>
              </View>
            </Link>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "nowrap",
                marginTop: 2,
                gap: 3,
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              <Text style={styles.websiteLine} wrap={false}>
                Website:
              </Text>
              <Text
                style={{
                  ...styles.websiteUrlPart,
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 0,
                }}
                wrap={false}
              >
                {websiteDisplay}
              </Text>
            </View>
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.qrCol}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt */}
              <Image
                src={qrSrc}
                style={{ width: PX(46), height: PX(46) }}
              />
              <Text style={styles.orderLabel}>Order online</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function BusinessCardPdfDocument({
  qrSrc,
  qrUrl,
  siteBaseUrl,
}: {
  qrSrc: string;
  qrUrl: string;
  siteBaseUrl?: string;
}) {
  const rows = [0, 1, 2, 3].map((r) => (
    <View key={r} style={styles.row}>
      <SingleCard
        qrSrc={qrSrc}
        qrUrl={qrUrl}
        siteBaseUrl={siteBaseUrl}
        index={r * 2}
      />
      <SingleCard
        qrSrc={qrSrc}
        qrUrl={qrUrl}
        siteBaseUrl={siteBaseUrl}
        index={r * 2 + 1}
      />
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

export async function buildBusinessCardsPdfBlob(
  qrUrl: string,
  siteBaseUrl?: string
): Promise<Blob> {
  const qrSrc = await QRCode.toDataURL(qrUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#0038a8", light: "#ffffff" },
  });
  return pdf(
    <BusinessCardPdfDocument
      qrSrc={qrSrc}
      qrUrl={qrUrl}
      siteBaseUrl={siteBaseUrl}
    />
  ).toBlob();
}
