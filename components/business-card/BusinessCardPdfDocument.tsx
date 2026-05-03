"use client";

import { Document, Page, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";

const PT = 72;
const CARD_W = 3.5 * PT;
const CARD_H = 2 * PT;
const GAP = 0.125 * PT;

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: "#ffffff",
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
  cardSlot: {
    width: CARD_W,
    height: CARD_H,
  },
  cardImage: {
    width: CARD_W,
    height: CARD_H,
    objectFit: "fill",
  },
});

function CardCellImage({ src }: { src: string }) {
  return (
    <View style={styles.cardSlot}>
      {/* Decorative repeat of the same card bitmap — not user-facing alt text in PDF */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={src} style={styles.cardImage} />
    </View>
  );
}

/**
 * 8-up US Letter sheet — each cell is a pixel-perfect copy of the on-screen card
 * (PNG data URL from html-to-image).
 */
export function BusinessCardPdfDocument({
  cardFacePngSrc,
}: {
  /** data:image/png;base64,... */
  cardFacePngSrc: string;
}) {
  const rows = [0, 1, 2, 3].map((r) => (
    <View key={r} style={styles.row}>
      <CardCellImage src={cardFacePngSrc} />
      <CardCellImage src={cardFacePngSrc} />
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
  cardFacePngSrc: string
): Promise<Blob> {
  return pdf(
    <BusinessCardPdfDocument cardFacePngSrc={cardFacePngSrc} />
  ).toBlob();
}
