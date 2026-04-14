"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingCart, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { FacebookButton } from "@/components/ui/FacebookButton";
import { useCart } from "@/components/cart/CartContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/availability", label: "Pick Up Dates" },
  { href: "/about", label: "About" },
  { href: "/culture", label: "Culture" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount, openDrawer } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div className="print:hidden">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[48] bg-black/35 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <header
        data-site-chrome
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "border-[var(--border)] bg-[var(--card)]/92 shadow-[0_8px_30px_rgba(0,40,100,0.08)] backdrop-blur-md"
            : "border-transparent bg-[var(--card)]/85 backdrop-blur-sm"
        }`}
      >
        <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4">
          <Link href="/" className="shrink-0" aria-label="Home">
            <Logo size="sm" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`nav-link pb-1 text-sm font-semibold ${
                  pathname === l.href
                    ? "nav-link-active text-[var(--primary)]"
                    : "text-[var(--text)] hover:text-[var(--primary)]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <FacebookButton size={22} />
            <button
              type="button"
              onClick={() => openDrawer()}
              className="btn-icon relative h-11 w-11"
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5 text-[var(--primary)]" />
              {itemCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold text-white">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="btn-icon h-11 w-11 md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <nav
            className="border-t border-[var(--border)] bg-[var(--card)] shadow-[0_12px_40px_rgba(0,40,100,0.12)] md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex max-h-[min(75vh,480px)] flex-col overflow-y-auto px-4 py-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="min-h-[48px] py-3 text-lg font-semibold text-[var(--text)] active:bg-[var(--bg-section)]"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/order"
                className="btn btn-gold btn-block mt-2 py-3"
                onClick={() => setMobileOpen(false)}
              >
                Order Now
              </Link>
            </div>
          </nav>
        ) : null}
      </header>
    </div>
  );
}
