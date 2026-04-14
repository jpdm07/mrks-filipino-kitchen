import type { Metadata } from "next";
import { BusinessCardPublicPage } from "@/components/business-card/BusinessCardPublicPage";

/** Avoid static prerender pulling heavy client-only PDF deps into a bad chunk graph */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business card · Mr. K's Filipino Kitchen",
  description:
    "Print 8 standard 3.5×2\" cards per Letter sheet—logo, contact, QR. Cypress, TX.",
  robots: { index: false, follow: true },
};

export default function BusinessCardPage() {
  return <BusinessCardPublicPage />;
}
