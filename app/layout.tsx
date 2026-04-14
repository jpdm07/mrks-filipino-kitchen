import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBanner } from "@/components/ui/AnnouncementBanner";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { SiteBackgroundMusic } from "@/components/music/SiteBackgroundMusic";
import { CATALOG_OG_IMAGE } from "@/lib/menu-catalog";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

const siteUrl = getPublicSiteOrigin();

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0038a8",
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
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen overflow-x-clip antialiased">
        <CustomCursor />
        <CartProvider>
          <Navbar />
          <AnnouncementBanner />
          <main className="min-h-[50vh] w-full min-w-0">{children}</main>
          <Footer />
          <SiteBackgroundMusic />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
