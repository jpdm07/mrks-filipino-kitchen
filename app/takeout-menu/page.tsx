import type { Metadata } from "next";
import Link from "next/link";
import { PrintableMenu } from "@/components/menu/PrintableMenu";
import { TakeoutMenuShareBar } from "@/components/menu/TakeoutMenuShareBar";
import { SITE } from "@/lib/config";
import { getPublicMenuItems } from "@/lib/public-menu-items";
import { getPublicAbsoluteUrl } from "@/lib/site-absolute-url";
import {
  takeoutOpenGraphDescription,
  takeoutOpenGraphTitle,
} from "@/lib/takeout-share";

export const dynamic = "force-dynamic";

const ogTitle = takeoutOpenGraphTitle();
const ogDescription = takeoutOpenGraphDescription();

export const metadata: Metadata = {
  title: `Printable takeout menu | ${SITE.name}`,
  description: ogDescription,
  alternates: {
    canonical: "/takeout-menu",
  },
  openGraph: {
    title: ogTitle,
    description: ogDescription,
    url: "/takeout-menu",
    type: "website",
    siteName: SITE.name,
  },
  twitter: {
    card: "summary_large_image",
    title: ogTitle,
    description: ogDescription,
  },
};

export default async function TakeoutMenuPage() {
  const items = await getPublicMenuItems();
  const shareUrl = getPublicAbsoluteUrl("/takeout-menu");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 print:max-w-none print:px-0 print:py-0">
      <nav className="mb-8 flex justify-center print:hidden">
        <Link
          href="/menu"
          className="text-center text-sm font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
        >
          ← Back to full menu and ordering
        </Link>
      </nav>

      <header className="mb-8 text-center print:hidden">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text)] sm:text-4xl">
          Printable takeout menu
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--text-muted)] sm:text-base">
          {SITE.name} · {SITE.location} · Pickup only. Print, save as PDF, or
          share this page using the buttons below.
        </p>
      </header>

      <div className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-center shadow-[var(--shadow)] sm:p-6 print:hidden">
        <TakeoutMenuShareBar shareUrl={shareUrl} showCopyLink={false} />
      </div>

      <PrintableMenu items={items} />
    </div>
  );
}
