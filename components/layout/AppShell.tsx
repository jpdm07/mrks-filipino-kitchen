"use client";

import { usePathname } from "next/navigation";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBanner } from "@/components/ui/AnnouncementBanner";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { SiteBackgroundMusic } from "@/components/music/SiteBackgroundMusic";
import { ConsoleNoiseFilter } from "@/components/system/ConsoleNoiseFilter";

function isAdminPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isAdminPath(pathname)) {
    return (
      <main className="flex min-h-dvh w-full min-w-0 flex-col bg-[var(--bg)]">
        <ConsoleNoiseFilter />
        {children}
      </main>
    );
  }

  return (
    <>
      <ConsoleNoiseFilter />
      <CustomCursor />
      <CartProvider>
        <Navbar />
        <AnnouncementBanner />
        <main className="min-h-[50vh] w-full min-w-0">{children}</main>
        <Footer />
        <SiteBackgroundMusic />
        <CartDrawer />
      </CartProvider>
    </>
  );
}
