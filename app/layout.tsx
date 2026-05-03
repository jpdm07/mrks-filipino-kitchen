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

const SEO_SITE_URL = "https://mrks-filipino-kitchen.vercel.app";
const SEO_TITLE =
  "Mr. K's Filipino Kitchen | Lumpia, Adobo & More | Cypress, TX";
const SEO_DESCRIPTION =
  "Authentic Filipino food in Cypress, TX. Order lumpia, pancit, adobo, tocino, leche flan, and more. Pickup only. Call 979-703-3827.";
const SEO_KEYWORDS =
  "Filipino food Cypress TX, lumpia Cypress TX, pancit near me, Filipino catering Houston, leche flan Cypress TX, adobo Cypress TX, Filipino restaurant near me, kwek kwek Cypress, tocino Cypress TX";

const LOCAL_FOOD_ESTABLISHMENT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  name: "Mr. K's Filipino Kitchen",
  telephone: "979-703-3827",
  email: "mrksfilipinokitchen@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cypress",
    addressRegion: "TX",
    postalCode: "77433",
    addressCountry: "US",
  },
  servesCuisine: "Filipino",
  priceRange: "$",
  url: SEO_SITE_URL,
  sameAs: ["https://www.facebook.com/mrksfilipinokitchen"],
  hasMenu: SEO_SITE_URL,
  serviceType: "Pickup",
  menu: [
    {
      "@type": "MenuItem",
      name: "Lumpia",
      description:
        "Hand-rolled Filipino spring rolls, fried golden crispy. Pork, turkey, or beef.",
      offers: { "@type": "Offer", price: "12.99", priceCurrency: "USD" },
    },
    {
      "@type": "MenuItem",
      name: "Pancit",
      description:
        "Rice vermicelli noodles stir-fried with chicken or shrimp, the Filipino birthday classic.",
      offers: { "@type": "Offer", price: "10.99", priceCurrency: "USD" },
    },
    {
      "@type": "MenuItem",
      name: "Chicken or Pork Adobo",
      description:
        "Slow-braised in soy-vinegar with garlic, bay leaf and peppercorns — the Filipino national dish.",
      offers: { "@type": "Offer", price: "11.99", priceCurrency: "USD" },
    },
    {
      "@type": "MenuItem",
      name: "Tocino",
      description:
        "Filipino-cured pork or chicken, pan-fried to a caramelized glaze.",
      offers: { "@type": "Offer", price: "11.99", priceCurrency: "USD" },
    },
    {
      "@type": "MenuItem",
      name: "Quail Eggs (Kwek-Kwek)",
      description:
        "Battered and deep-fried quail eggs, iconic Filipino street food with dipping sauce.",
      offers: { "@type": "Offer", price: "7.99", priceCurrency: "USD" },
    },
    {
      "@type": "MenuItem",
      name: "Leche Flan",
      description:
        "Steamed Filipino caramel flan, silky smooth with deep amber caramel.",
      offers: { "@type": "Offer", price: "3.50", priceCurrency: "USD" },
    },
    {
      "@type": "MenuItem",
      name: "Yema",
      description:
        "Buttery slow-cooked Filipino milk candy, the classic merienda treat.",
      offers: { "@type": "Offer", price: "0.75", priceCurrency: "USD" },
    },
  ],
} as const;

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
  metadataBase: new URL(SEO_SITE_URL),
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  alternates: { canonical: SEO_SITE_URL },
  openGraph: {
    title: "Mr. K's Filipino Kitchen — Authentic Filipino Food in Cypress, TX",
    description:
      "Hand-rolled lumpia, slow-braised adobo, silky leche flan and more. Pickup only in Cypress, TX.",
    url: SEO_SITE_URL,
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
  other: {
    keywords: SEO_KEYWORDS,
    "og:type": "restaurant",
    "og:url": SEO_SITE_URL,
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(LOCAL_FOOD_ESTABLISHMENT_SCHEMA),
          }}
        />
      </head>
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
