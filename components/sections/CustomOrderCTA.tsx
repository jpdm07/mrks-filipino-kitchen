import Link from "next/link";

export function CustomOrderCTA() {
  return (
    <section className="relative overflow-hidden bg-[var(--primary)] py-16 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 85% 55% at 15% 15%, rgba(255,255,255,0.14), transparent 50%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(206,17,38,0.35), transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 40%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-4 text-center">
        <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold drop-shadow-md md:text-4xl">
          Don&apos;t See What You&apos;re Looking For?
        </h2>
        <p className="mt-4 text-lg text-white/92">
          We can often make custom Filipino dishes not on the menu! Just ask.
        </p>
        <Link
          href="/contact?subject=custom"
          className="btn btn-gold mt-8 px-8"
        >
          Inquire About a Custom Dish
        </Link>
      </div>
    </section>
  );
}
