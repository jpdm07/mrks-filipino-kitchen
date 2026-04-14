import { SITE, salesTaxPercentLabel } from "@/lib/config";

export function SalesTaxDisclosure({ className = "" }: { className?: string }) {
  const pct = salesTaxPercentLabel();
  return (
    <p
      className={`text-xs leading-relaxed text-[var(--text-muted)] ${className}`}
    >
      <span className="font-medium text-[var(--text)]">Sales tax ({pct})</span>{" "}
      is the combined Texas state and local rate for pickup at {SITE.location}.
      It applies to your order subtotal (items + utensil fees), not a separate
      markup on ingredients. We keep this aligned with the usual rate for this
      ZIP; verify with the{" "}
      <a
        href="https://comptroller.texas.gov/taxes/sales/"
        className="underline decoration-[var(--primary)]/40 underline-offset-2 hover:text-[var(--primary)]"
        target="_blank"
        rel="noopener noreferrer"
      >
        Texas Comptroller
      </a>{" "}
      if you need official guidance.
    </p>
  );
}
