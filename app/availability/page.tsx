import type { Metadata } from "next";
import { PublicAvailabilityCalendar } from "@/components/availability/PublicAvailabilityCalendar";

export const metadata: Metadata = {
  title: "Pickup availability",
  description:
    "See upcoming pickup dates for Mr. K's Filipino Kitchen in Cypress, TX. Time slots are set at checkout.",
};

export default function AvailabilityPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text)] sm:text-4xl">
        Pickup availability
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        View-only calendar — choosing a date takes you to checkout; nothing is
        held until you complete an order.
      </p>

      <div className="mt-8 rounded-2xl border border-[#0038A8]/20 bg-[#eef4ff] px-5 py-6 shadow-sm sm:px-8">
        <h2 className="text-lg font-bold text-[var(--text)]">
          How ordering works at Mr. K&apos;s Kitchen
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--text)]">
          <li>📅 Pick an available date below (time at checkout)</li>
          <li>🛒 Place your order on the menu page</li>
          <li>💚 Send payment via Zelle, Venmo, or Cash App</li>
          <li>✅ Mr. K confirms your order and you&apos;re all set!</li>
        </ol>
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          All orders are pickup only from Cypress, TX 77433.
        </p>
      </div>

      <div className="mt-10">
        <PublicAvailabilityCalendar />
      </div>
    </div>
  );
}
