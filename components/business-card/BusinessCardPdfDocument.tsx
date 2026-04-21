"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
  Link,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { SITE } from "@/lib/config";
import { hrefWithHttps } from "@/lib/url-display";
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
import {
  absoluteBusinessCardFaceUrl,
  BC_ART_QR_BOTTOM_PX,
  BC_ART_QR_RIGHT_PX,
  BC_ART_QR_SIZE_PX,
} from "@/lib/business-card-artwork";

const PT = 72;
const CARD_W = 3.5 * PT;
const CARD_H = 2 * PT;
const GAP = 0.125 * PT;

/** Map 336px-wide screen card → PDF points */
const PX = (n: number) => (n * CARD_W) / 336;

const COL = {
  navy: "#0E1D35",
  cream: "#FBF6EC",
  gold: "#D4A944",
  goldMuted: "#C99A3E",
  goldDark: "#8C6E29",
  body: "#2A3142",
};

const CONTENT_PAD = PX(10);
const INNER_W = CARD_W - 2 * CONTENT_PAD;
const LEFT_W = INNER_W * 0.44;
const DIVIDER_W = Math.max(PX(1), 1);
const RIGHT_W = INNER_W - LEFT_W - DIVIDER_W;

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
  cardRoot: {
    width: CARD_W,
    height: CARD_H,
    position: "relative",
  },
  outerRule: {
    position: "absolute",
    left: PX(5),
    top: PX(5),
    width: CARD_W - PX(10),
    height: CARD_H - PX(10),
    borderRadius: 3,
    borderWidth: 1,
    borderColor: COL.goldMuted,
    borderStyle: "solid",
  },
  innerRule: {
    position: "absolute",
    left: PX(9),
    top: PX(9),
    width: CARD_W - PX(18),
    height: CARD_H - PX(18),
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: COL.goldMuted,
    borderStyle: "solid",
  },
  cardBody: {
    position: "absolute",
    left: CONTENT_PAD,
    top: CONTENT_PAD,
    width: INNER_W,
    height: CARD_H - 2 * CONTENT_PAD,
    flexDirection: "row",
  },
  leftPanel: {
    width: LEFT_W,
    height: "100%",
    backgroundColor: COL.navy,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: PX(8),
    paddingRight: PX(8),
    paddingTop: PX(10),
    paddingBottom: PX(10),
  },
  dividerVert: {
    width: DIVIDER_W,
    height: "100%",
    backgroundColor: COL.goldMuted,
  },
  rightPanel: {
    width: RIGHT_W,
    height: "100%",
    backgroundColor: COL.cream,
    paddingLeft: PX(10),
    paddingRight: PX(10),
    paddingTop: PX(8),
    paddingBottom: PX(8),
    justifyContent: "space-between",
  },
  mrKs: {
    fontSize: 26,
    color: COL.gold,
    fontFamily: "Helvetica-Bold",
    marginTop: PX(6),
    textAlign: "center",
  },
  fkLeft: {
    fontSize: 7,
    color: COL.cream,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: PX(8),
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  tagLeft: {
    fontSize: 7,
    color: COL.cream,
    fontFamily: "Helvetica-Oblique",
    textAlign: "center",
    marginTop: PX(8),
    lineHeight: 1.35,
  },
  rightHeadBlock: {
    borderBottomWidth: 1,
    borderBottomColor: COL.goldMuted,
    paddingBottom: PX(6),
  },
  rightHead: {
    fontSize: 7,
    color: COL.goldDark,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  phone: {
    fontSize: 8.5,
    color: COL.navy,
    fontFamily: "Helvetica-Bold",
    marginTop: PX(6),
  },
  meta: {
    fontSize: 7.5,
    color: COL.body,
    marginTop: PX(2),
    fontFamily: "Helvetica",
  },
  metaIt: {
    fontSize: 7.5,
    color: COL.goldDark,
    marginTop: PX(4),
    fontFamily: "Helvetica-Oblique",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: PX(8),
    gap: PX(6),
  },
  orderLine: {
    fontSize: 5.5,
    color: COL.goldDark,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  qrWrap: {
    width: PX(BC_ART_QR_SIZE_PX),
    flexShrink: 0,
  },
  cardArtOuter: {
    width: CARD_W,
    height: CARD_H,
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
});

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

/** Vector layout — Helvetica approximates web fonts in PDF. */
function SingleCardVector({ qrSrc }: { qrSrc: string }) {
  const facebookHref = hrefWithHttps(SITE.facebookUrl);
  const orderSlash = `${BC_ORDER_TRACKED} / ${BC_ONLINE_TRACKED} / ${BC_SCAN_ARROW}`;
  return (
    <View style={styles.cardRoot}>
      <View style={styles.outerRule} />
      <View style={styles.innerRule} />
      <View style={styles.cardBody}>
        <View style={styles.leftPanel}>
          <View
            style={{
              width: PX(22),
              height: PX(22),
              borderRadius: PX(11),
              backgroundColor: COL.gold,
              marginBottom: PX(4),
            }}
          />
          <Text style={styles.mrKs}>Mr. K&apos;s</Text>
          <Text style={styles.fkLeft}>{BC_FILIPINO_KITCHEN_CARD}</Text>
          <Text style={styles.tagLeft}>
            {BC_TAGLINE_MAIN}
            {"\n"}
            {BC_TAGLINE_LOCATION}
          </Text>
        </View>
        <View style={styles.dividerVert} />
        <View style={styles.rightPanel}>
          <View>
            <View style={styles.rightHeadBlock}>
              <Text style={styles.rightHead}>{BC_RIGHT_HEADLINE}</Text>
            </View>
            <Link src={SITE.phoneTel}>
              <Text style={styles.phone}>{SITE.phoneDisplay}</Text>
            </Link>
            <Link src={`mailto:${SITE.email}`}>
              <Text style={styles.meta}>{SITE.email}</Text>
            </Link>
            <Text style={styles.meta}>{SITE.location}</Text>
            <Link src={facebookHref}>
              <Text style={styles.metaIt}>{facebookCardLabel()}</Text>
            </Link>
          </View>
          <View style={styles.bottomRow}>
            <Text style={styles.orderLine}>{orderSlash}</Text>
            <View style={styles.qrWrap}>
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
            <SingleCardVector key={`${r}-a`} qrSrc={qrSrc} />,
            <SingleCardVector key={`${r}-b`} qrSrc={qrSrc} />,
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
    width: 320,
    margin: 1,
    color: { dark: COL.navy, light: COL.cream },
  });
  const faceImageSrc = await resolveFaceImageUrlForPdf();
  return pdf(
    <BusinessCardPdfDocument qrSrc={qrSrc} faceImageSrc={faceImageSrc} />
  ).toBlob();
}
