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
        alt="Sinigang — Mr. K's Filipino Kitchen"
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
            "radial-gradient(ellipse 88% 65% at 50% 16%, rgba(251,246,236,0.12), transparent 52%), linear-gradient(135deg, rgba(6,15,31,0.91) 0%, rgba(14,29,53,0.82) 42%, rgba(26,48,85,0.68) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/25"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="hero-headline-enter font-playfair text-4xl font-black leading-tight tracking-tight text-[color:var(--cream)] drop-shadow-[0_2px_24px_rgba(6,15,31,0.45)] sm:text-5xl md:text-6xl">
          Authentic Filipino flavors, made with love
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-cormorant text-lg text-[color:rgba(251,246,236,0.94)] drop-shadow-[0_1px_12px_rgba(6,15,31,0.35)]">
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
