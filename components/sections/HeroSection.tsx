import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { PickupBadge } from "@/components/ui/PickupBadge";
import { CATALOG_HERO_IMAGE } from "@/lib/menu-catalog";
import { nextImageSharpnessProps } from "@/lib/site-visuals";

export function HeroSection() {
  const sharp = nextImageSharpnessProps(CATALOG_HERO_IMAGE);
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <Image
        src={CATALOG_HERO_IMAGE}
        alt="Homemade Filipino lumpia from Mr. K's Filipino Kitchen"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
        {...sharp}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 90% 70% at 50% 18%, rgba(255,255,255,0.14), transparent 55%), linear-gradient(135deg, rgba(0,32,92,0.88) 0%, rgba(0,56,168,0.72) 38%, rgba(130,24,40,0.55) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/25"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] sm:text-5xl md:text-6xl">
          Authentic Filipino Flavors, Made with Love
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/95 drop-shadow-[0_1px_12px_rgba(0,0,0,0.25)]">
          Home-cooked meals crafted from generations of tradition. Order for
          pickup in Cypress, TX—we&apos;ll confirm your date after you order.
        </p>
        <div className="mt-10 flex w-full max-w-md flex-col items-stretch justify-center gap-4 sm:mx-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
          <Link
            href="/menu"
            className="btn btn-gold w-full text-center sm:w-auto sm:min-w-[200px]"
          >
            View Our Menu
          </Link>
          <Link
            href="/order"
            className="btn btn-outline-light w-full text-center sm:w-auto sm:min-w-[200px]"
          >
            Order Now
          </Link>
        </div>
        <div className="mt-8 flex justify-center">
          <PickupBadge />
        </div>
        <div
          className="hero-scroll-hint mt-16 flex justify-center text-white/90"
          aria-hidden
        >
          <ChevronDown className="h-10 w-10" />
        </div>
      </div>
    </section>
  );
}
