import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { PrintComplianceButton } from "@/components/admin/TexasFoodCompliancePrintButton";

export const metadata: Metadata = {
  title: "Texas food & pickup rules (reference) | Admin",
  robots: { index: false, follow: false },
};

const DSHS_COTTAGE =
  "https://www.dshs.texas.gov/food-establishments/cottage-food";
const DSHS_FOOD_HANDLERS = "https://www.dshs.texas.gov/food-handlers";

/**
 * Owner reference: Texas pickup / cottage context + packaging & prep habits.
 * Not legal advice—verify on official sites before relying on this page.
 */
export default async function TexasFoodCompliancePage() {
  await requireAdmin();

  return (
    <div className="texas-compliance-page mx-auto max-w-3xl space-y-8 pb-20 print:max-w-none print:pb-4 print:text-black">
      <p className="text-sm text-[color:var(--primary)] print:hidden">
        Owner reference only — not legal or professional advice
      </p>
      <header className="space-y-3 print:space-y-2">
        <h1
          className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[color:var(--primary)] print:text-2xl print:text-black"
        >
          Texas pickup &amp; home-kitchen compliance — quick reference
        </h1>
        <p className="text-base text-[var(--text-muted)] print:text-sm print:text-neutral-800">
          Use this as a reminder to double-check <strong>current</strong> Texas
          Department of State Health Services (TDSHS) rules, any{" "}
          <strong>county / city</strong> add-ons, and your own insurance and tax
          situation. When in doubt, confirm on official sources or with a
          qualified professional.
        </p>
        <div className="rounded-lg border-2 border-amber-600/40 bg-amber-50/90 p-4 text-sm text-amber-950 print:border print:bg-white">
          <p className="font-bold">Disclaimer</p>
          <p className="mt-1 leading-relaxed">
            This page is a <strong>memory aid for Mr. K&apos;s Filipino Kitchen</strong>.
            It is <strong>not</strong> legal, tax, or food-safety professional advice. Laws
            and agency guidance change. Always read the current statute, TDSHS
            guidance, and local health department information for your exact
            operation, products, and how you sell (pickup, delivery, events).
          </p>
        </div>
        <div className="print:hidden">
          <PrintComplianceButton />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Or use <kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 font-sans">Ctrl</kbd>{" "}
            + <kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 font-sans">P</kbd>{" "}
            → Save as PDF for a binder or kitchen clipboard.
          </p>
        </div>
        <p className="text-xs text-[var(--text-muted)] print:text-[10pt] print:text-neutral-600">
          Printed: {new Date().toLocaleDateString("en-US", { dateStyle: "long" })} (Central
          / browser local time)
        </p>
      </header>

      <section className="break-inside-avoid rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 print:border-neutral-300 print:shadow-none">
        <h2 className="text-lg font-bold text-[color:var(--primary)] print:text-black">
          Official sources (bookmark these)
        </h2>
        <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-[var(--text)] print:text-[11pt]">
          <li>
            <a
              href={DSHS_COTTAGE}
              className="font-semibold text-[color:var(--primary)] underline underline-offset-2 print:text-black"
            >
              TDSHS — Cottage food production
            </a>{" "}
            (allowed foods, packaging, labeling, registration for certain
            categories under current law, updates such as SB 541).
          </li>
          <li>
            <a
              href="https://statutes.capitol.texas.gov/Docs/HS/htm/HS.437.htm"
              className="font-semibold text-[color:var(--primary)] underline underline-offset-2 print:text-black"
            >
              Texas Health and Safety Code, Chapter 437
            </a>{" "}
            — read the <strong>current</strong> sections on cottage food
            production operations and labeling.
          </li>
          <li>
            <strong>Your county / city</strong> — some jurisdictions add permits,
            zoning, or event rules beyond state cottage rules.
          </li>
        </ul>
      </section>

      <section className="break-inside-avoid rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 print:border-neutral-300 print:shadow-none">
        <h2 className="text-lg font-bold text-[color:var(--primary)] print:text-black">
          Labeling (cottage / home production — confirm exact list on TDSHS)
        </h2>
        <p className="mt-2 text-sm text-[var(--text)] print:text-[11pt] print:leading-relaxed">
          In general, Texas requires cottage foods sold to consumers to be{" "}
          <strong>packaged and labeled</strong> with specific information, unless
          the law exempts a bulky item (then the same info may go on a receipt
          or invoice as provided by rule). TCS (time/temperature control for
          safety) items have <strong>extra</strong> requirements, including
          possible registration. Pull the <strong>exact</strong> checklist from TDSHS
          for the products you sell.
        </p>
        <div className="mt-3 rounded border border-neutral-200 bg-white p-3 font-mono text-xs leading-relaxed text-neutral-900 print:text-[10pt]">
          <p className="font-sans text-sm font-bold text-[color:var(--primary)] print:text-black">
            Example statutory disclosure (verify current wording in law / rules)
          </p>
          <p className="mt-2 text-[11px] font-bold uppercase leading-snug sm:text-sm">
            THIS PRODUCT WAS PRODUCED IN A PRIVATE RESIDENCE THAT IS NOT SUBJECT TO
            GOVERNMENTAL LICENSING OR INSPECTION.
          </p>
        </div>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-[var(--text)] print:text-[11pt]">
          <li>Business <strong>name and address</strong> (or follow current rules for a TDSHS identifier when available).</li>
          <li>
            <strong>Common name</strong> of the product and, when required,{" "}
            <strong>ingredients / allergens</strong> per federal major-allergen rules
            and Texas cottage rules.
          </li>
          <li>
            <strong>Net weight or volume</strong> where required.
          </li>
          <li>
            For TCS / refrigerated products: <strong>date made</strong> and
            the required <strong>safe handling</strong> statement in at least{" "}
            <strong>12-point</strong> type on label or on invoice/receipt with the
            product — <strong>confirm on TDSHS for your item class</strong>.
          </li>
        </ul>
      </section>

      <section className="break-inside-avoid rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 print:border-neutral-300 print:shadow-none">
        <h2 className="text-lg font-bold text-[color:var(--primary)] print:text-black">
          Packaging, prep &amp; handoff
        </h2>
        <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-[var(--text)] print:text-[11pt] print:leading-relaxed">
          <li>
            Use <strong>food-grade</strong> packaging that protects food from
            dirt, drips, and cross-contact; seal where appropriate; avoid reusing
            non-food containers.
          </li>
          <li>
            Hot food: vent as needed; cold food: <strong>cold chain</strong> in
            transit (insulated bag, ice packs) for items that need refrigeration;
            don&apos;t let TCS food sit in the &quot;danger zone&quot; during pickup windows.
          </li>
          <li>
            <strong>Time &amp; temperature</strong> discipline in the home kitchen
            (cooling large batches, reheating, holding) — follow a recognized food
            safety training curriculum (see below).
          </li>
          <li>
            <strong>Allergens &amp; cross-contact</strong>: know what&apos;s in each
            product; clean surfaces and utensils between different allergens when
            feasible; label truthfully.
          </li>
          <li>
            <strong>Pickup / delivery / events</strong>: your permit path may
            differ for on-site service vs. pre-ordered pickup; farmers markets
            and festivals often have separate local rules. Confirm before you book.
          </li>
        </ul>
      </section>

      <section className="break-inside-avoid rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 print:border-neutral-300 print:shadow-none">
        <h2 className="text-lg font-bold text-[color:var(--primary)] print:text-black">
          People &amp; training
        </h2>
        <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-[var(--text)] print:text-[11pt] print:leading-relaxed">
          <li>
            Texas <strong>food handler certification</strong> often applies to people
            who handle food for sale — use an <strong>accredited</strong> program
            and renew before expiry. See{" "}
            <a
              href={DSHS_FOOD_HANDLERS}
              className="font-semibold text-[color:var(--primary)] underline underline-offset-2 print:text-black"
            >
              TDSHS — food handler training programs
            </a>{" "}
            (accredited online and in-person lists).
          </li>
          <li>Keep a copy of certificates where you run prep (home / commissary).</li>
        </ul>
      </section>

      <section className="break-inside-avoid rounded-lg border-2 border-[#FFC200] bg-[var(--gold-light)] p-4 print:border-black print:bg-white print:text-black">
        <h2 className="text-lg font-bold text-[color:var(--primary)] print:text-black">
          Pre-event / pre-pickup checklist (print &amp; tick)
        </h2>
        <ol className="mt-3 list-outside list-decimal space-y-2 pl-5 text-sm print:text-[11pt] print:leading-relaxed">
          <li>Label matches product, batch, and (if required) made-on date.</li>
          <li>Allergens and disclosure line present and accurate.</li>
          <li>Seals intact; no tears; liquids double-bagged or taped if needed.</li>
          <li>Hot vs. cold separation in transport; ice packs for cold items.</li>
          <li>Hand washing / gloves used per your SOP; sanitizer in kit for events if allowed.</li>
          <li>Order matches bag tags / name on order — verify at handoff.</li>
          <li>Remind customers of <strong>safe storage</strong> and consume-by guidance verbally or on the card.</li>
        </ol>
      </section>

      <p className="text-sm text-[var(--text-muted)] print:mt-4 print:text-[10pt] print:text-neutral-700">
        Also see{" "}
        <Link
          href="/admin/kitchen-guide"
          className="font-semibold text-[color:var(--primary)] underline print:text-black"
        >
          Kitchen guide
        </Link>{" "}
        for internal prep notes and{" "}
        <Link
          href="/admin/tax-documentation"
          className="font-semibold text-[color:var(--primary)] underline print:text-black"
        >
          Tax export
        </Link>{" "}
        for records.
      </p>
    </div>
  );
}
