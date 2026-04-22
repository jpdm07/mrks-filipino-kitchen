import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/** 404: visiting any path with no route still serves this page (status 404 is correct). */
export const metadata: Metadata = {
  title: "Page not found | Mr. K's Filipino Kitchen",
  description: "That page does not exist. Head back to the home page or menu.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      {/* Stacked wordmark so “Mr. K’s” lines up with centered copy (same as order confirmation) */}
      <Logo size="lg" variant="stacked" className="mx-auto" />
      <svg
        viewBox="0 0 120 120"
        className="mt-8 h-32 w-32 text-[var(--gold)]"
        aria-hidden
      >
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="var(--bg-section)"
          stroke="var(--primary)"
          strokeWidth="3"
        />
        <text
          x="60"
          y="72"
          textAnchor="middle"
          fill="var(--accent)"
          style={{ fontSize: 36, fontWeight: 700 }}
        >
          ?
        </text>
      </svg>
      <h1 className="mt-6 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text)]">
        Ay nako! Page not found.
      </h1>
      <p className="mt-3 max-w-md text-[var(--text-muted)]">
        This page must have been eaten. Let&apos;s get you back to the good
        stuff.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/" className="btn btn-primary px-6">
          Back to Home
        </Link>
        <Link href="/menu" className="btn btn-outline-dark px-6">
          View Our Menu
        </Link>
      </div>
    </div>
  );
}
