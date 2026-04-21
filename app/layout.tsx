import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  Dancing_Script,
  Playfair_Display,
} from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { GoogleAnalyticsRouteTracker } from "@/components/analytics/GoogleAnalyticsRouteTracker";
import { AppShell } from "@/components/layout/AppShell";
import { CATALOG_OG_IMAGE } from "@/lib/menu-catalog";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

const siteUrl = getPublicSiteOrigin();

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  weight: ["500"],
});

const dancing = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing",
  display: "swap",
  weight: ["700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0E1D35",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mr. K's Filipino Kitchen | Authentic Filipino Food · Cypress, TX",
  description:
    "Home-cooked authentic Filipino meals in Cypress, TX. Lumpia, pancit, caramel flan, tocino & more. Pickup only.",
  openGraph: {
    title: "Mr. K's Filipino Kitchen",
    description:
      "Authentic Filipino food in Cypress, TX. Lumpia, pancit, flan & more. Order for pickup!",
    url: siteUrl,
    siteName: "Mr. K's Filipino Kitchen",
    images: [
      {
        url: CATALOG_OG_IMAGE,
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${cormorant.variable} ${dancing.variable}`}
    >
      <body className="font-cormorant min-h-screen overflow-x-clip antialiased font-medium">
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <GoogleAnalyticsRouteTracker />
        </Suspense>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
