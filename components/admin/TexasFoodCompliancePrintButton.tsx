"use client";

/**
 * Opens the browser print dialog (save to PDF or paper) for the compliance page.
 */
export function PrintComplianceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border-2 border-[color:var(--primary)] bg-[color:var(--cream)] px-4 py-2.5 text-sm font-bold text-[color:var(--primary)] shadow-sm transition hover:bg-[var(--gold-light)]"
    >
      Print or save as PDF
    </button>
  );
}
