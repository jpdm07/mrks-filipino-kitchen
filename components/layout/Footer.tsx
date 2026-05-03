import Link from "next/link";
import { PhilippineSun } from "@/components/PhilippineSun";
import { Logo } from "@/components/ui/Logo";
import { FacebookButton } from "@/components/ui/FacebookButton";
import { SITE } from "@/lib/config";

export function Footer() {
  return (
    <footer
      data-site-chrome
      className="relative z-[45] isolate border-t-4 border-[color:var(--gold-muted)] bg-[color:var(--primary)] text-[color:var(--cream)] print:hidden"
    >
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          <div className="md:pr-4">
            <Logo size="md" theme="dark" />
            <p className="mt-3 max-w-xs font-cormorant text-sm leading-relaxed text-[color:rgba(251,246,236,0.82)]">
              Authentic Filipino flavors, made with love in Cypress, TX
            </p>
            <div className="mt-4">
              <FacebookButton className="border-[color:var(--gold-muted)]/45 bg-[rgba(251,246,236,0.08)] shadow-none hover:border-[color:var(--gold)]" />
            </div>
          </div>
          <div>
            <h3 className="font-playfair text-lg font-bold text-[color:var(--cream)]">
              Quick links
            </h3>
            <ul className="mt-3 space-y-2 text-sm font-medium">
              <li>
                <Link href="/menu" className="link-footer text-[color:var(--gold)]">
                  Menu
                </Link>
              </li>
              <li>
                <Link
                  href="/availability"
                  className="link-footer text-[color:var(--gold)]"
                >
                  View Pickup Availability →
                </Link>
              </li>
              <li>
                <Link href="/order" className="link-footer text-[color:var(--gold)]">
                  Order Now
                </Link>
              </li>
              <li>
                <Link href="/about" className="link-footer text-[color:var(--gold)]">
                  About
                </Link>
              </li>
              <li>
                <Link href="/culture" className="link-footer text-[color:var(--gold)]">
                  Filipino culture & trivia
                </Link>
              </li>
              <li>
                <Link href="/contact" className="link-footer text-[color:var(--gold)]">
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/contact?subject=custom"
                  className="link-footer text-[color:var(--gold)]"
                >
                  Custom Order Inquiry
                </Link>
              </li>
              <li>
                <Link
                  href="/business-card"
                  className="link-footer text-[color:var(--gold)]"
                >
                  Printable business card
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-playfair text-lg font-bold text-[color:var(--cream)]">
              Contact
            </h3>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[color:rgba(251,246,236,0.82)]">
              Mr. K&apos;s Filipino Kitchen · 979-703-3827 · Cypress, TX 77433
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={SITE.phoneTel}
                  className="font-semibold text-[color:var(--gold)] underline decoration-[color:var(--gold-muted)] underline-offset-4 hover:decoration-[color:var(--cream)]"
                >
                  {SITE.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="link-footer text-[color:var(--gold)]"
                >
                  {SITE.email}
                </a>
              </li>
              <li className="font-cormorant text-[color:rgba(251,246,236,0.88)]">
                {SITE.location}
              </li>
              <li className="font-playfair font-bold text-[color:var(--gold)]">
                Pickup only — no delivery
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-[color:var(--gold-muted)]/35 bg-[color:var(--primary-deep)]">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:justify-between md:text-left">
            <div className="flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-3">
              <PhilippineSun
                size={22}
                color="var(--gold)"
                decorative
                className="shrink-0 opacity-90"
              />
              <p className="text-sm text-[color:rgba(251,246,236,0.85)]">
                <span className="font-medium text-[color:var(--cream)]">
                  © {new Date().getFullYear()} Mr. K&apos;s Filipino Kitchen · Cypress, TX
                </span>
              </p>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-[color:rgba(251,246,236,0.72)] md:max-w-xs md:text-right">
              Need a card for the counter or a flyer handout? Use our{" "}
              <Link
                href="/business-card"
                className="font-semibold text-[color:var(--gold)] underline decoration-[color:var(--gold-muted)] underline-offset-2 hover:decoration-[color:var(--cream)]"
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
