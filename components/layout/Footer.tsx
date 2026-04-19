import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { FacebookButton } from "@/components/ui/FacebookButton";
import { SITE } from "@/lib/config";

export function Footer() {
  return (
    <footer
      data-site-chrome
      className="relative z-[45] isolate border-t border-[var(--border)] bg-[var(--bg-section)] print:hidden"
    >
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          <div className="md:pr-4">
            <Logo size="md" />
            <p className="mt-3 max-w-xs text-sm text-[var(--text-muted)]">
              Authentic Filipino flavors, made with love in Cypress, TX
            </p>
            <div className="mt-4">
              <FacebookButton />
            </div>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text)]">
              Quick links
            </h3>
            <ul className="mt-3 space-y-2 text-sm font-medium">
              <li>
                <Link href="/menu" className="link-footer text-[var(--primary)]">
                  Menu
                </Link>
              </li>
              <li>
                <Link
                  href="/availability"
                  className="link-footer text-[var(--primary)]"
                >
                  View Pickup Availability →
                </Link>
              </li>
              <li>
                <Link href="/order" className="link-footer text-[var(--primary)]">
                  Order Now
                </Link>
              </li>
              <li>
                <Link href="/about" className="link-footer text-[var(--primary)]">
                  About
                </Link>
              </li>
              <li>
                <Link href="/culture" className="link-footer text-[var(--primary)]">
                  Filipino culture & trivia
                </Link>
              </li>
              <li>
                <Link href="/contact" className="link-footer text-[var(--primary)]">
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/contact?subject=custom"
                  className="link-footer text-[var(--primary)]"
                >
                  Custom Order Inquiry
                </Link>
              </li>
              <li>
                <Link
                  href="/business-card"
                  className="link-footer text-[var(--primary)]"
                >
                  Printable business card
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text)]">
              Contact
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href={SITE.phoneTel} className="font-semibold text-[var(--primary)]">
                  {SITE.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="link-footer text-[var(--primary)]"
                >
                  {SITE.email}
                </a>
              </li>
              <li className="text-[var(--text)]">{SITE.location}</li>
              <li className="font-semibold text-[var(--accent)]">
                Pickup only — no delivery
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:justify-between md:text-left">
            <div className="text-sm text-[var(--text-muted)]">
              <p className="font-medium text-[var(--text)]">
                © {new Date().getFullYear()} Mr. K&apos;s Filipino Kitchen · Cypress, TX
              </p>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-[var(--text-muted)] md:max-w-xs md:text-right">
              Need a card for the counter or a flyer handout? Use our{" "}
              <Link
                href="/business-card"
                className="font-semibold text-[var(--primary)] underline decoration-[var(--primary)]/40 underline-offset-2 hover:decoration-[var(--primary)]"
              >
                print-ready business card
              </Link>{" "}
              with QR code and logo.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
