import { Car } from "lucide-react";

export function PickupNotice() {
  return (
    <section className="pattern-bg py-16">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <Car className="mx-auto h-16 w-16 text-[var(--primary)]" aria-hidden />
        <h2 className="mt-4 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text)]">
          Pickup Only
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[var(--text-muted)]">
          Orders are for pickup in Cypress, TX 77433. After you place an order,
          we will contact you to confirm your pickup time. You&apos;ll pick up
          your food from us, fresh and ready.
        </p>
        <div className="mt-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 text-left shadow-[var(--shadow)]">
          <p className="text-[var(--text)]">
            📦 We accept{" "}
            <strong>bulk recurring orders every 2 weeks</strong>, starting from
            your first order fulfillment date. Great for families, offices, and
            regular customers!
          </p>
        </div>
      </div>
    </section>
  );
}
