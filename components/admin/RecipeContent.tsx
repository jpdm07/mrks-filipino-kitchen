import type { BatchScale, Ingredient, Recipe, RecipeVariant } from "@/lib/recipes";
import { batchCostForLumpiaVariant, sharedIngredientsCostExcludingVariants } from "@/lib/recipes";
import {
  type LumpiaMarginRow,
  adoboMarginDisplayRows,
  flanMarginDisplayRows,
  lumpiaMarginDisplayRows,
} from "@/lib/recipe-margins";
import { MENU_CATALOG } from "@/lib/menu-catalog";

function IngredientTable({ rows, caption }: { rows: Ingredient[]; caption: string }) {
  return (
    <div className="mb-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="caption-bottom pt-2 text-left text-xs text-slate-600 print:text-black">
          {caption}
        </caption>
        <thead>
          <tr className="border-b-2 border-[color:var(--primary)] bg-[color:var(--primary)]/5">
            <th className="py-2 pr-2 font-semibold">Ingredient</th>
            <th className="py-2 pr-2 font-semibold">Amount</th>
            <th className="py-2 pr-2 font-semibold">Cost</th>
            <th className="py-2 pr-2 font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.name} className="border-b border-slate-200/90">
              <td className="align-top py-1.5 pr-2 text-slate-800">{i.name}</td>
              <td className="align-top py-1.5 pr-2 text-slate-600">{i.amount}</td>
              <td className="align-top py-1.5 pr-2 tabular-nums text-slate-800">
                ${i.unitCost.toFixed(2)}
              </td>
              <td className="align-top py-1.5 text-slate-600 text-xs">
                {i.source?.trim() ? i.source : "—"}
                {i.notes ? ` · ${i.notes}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VariantOverrideTable({ v, meatOnly }: { v: RecipeVariant; meatOnly: boolean }) {
  const m = (v.ingredientOverrides ?? []) as Partial<Ingredient>[];
  if (!m.length) return null;
  const rows = m.map((ing) => ({
    name: ing.name ?? "—",
    amount: ing.amount ?? "",
    unitCost: ing.unitCost ?? 0,
    source: ing.source,
    notes: ing.notes,
  })) as Ingredient[];
  if (meatOnly) {
    return <IngredientTable rows={rows} caption="Protein (per variant) — prorated into total below" />;
  }
  return <IngredientTable rows={rows} caption="Override" />;
}

function ScalesTable({
  scales,
  caption,
  yieldColumnLabel = "Yield (ramekins)",
}: {
  scales: BatchScale[];
  caption?: string;
  yieldColumnLabel?: string;
}) {
  return (
    <div className="mb-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="mb-1 text-left text-sm font-semibold text-[color:var(--primary)] print:text-black">
          {caption ?? "Batch scale (8 ramekins / lb rule)"}
        </caption>
        <thead>
          <tr className="border-b-2 border-[color:var(--primary)] bg-[color:var(--primary)]/5">
            <th className="py-2 pr-2">×</th>
            <th className="py-2 pr-2">{yieldColumnLabel}</th>
            <th className="py-2 pr-2">Total cost</th>
            <th className="py-2 pr-2">Revenue (at list)</th>
            <th className="py-2 pr-2">Profit</th>
            <th className="py-2">Notes (scaled amounts)</th>
          </tr>
        </thead>
        <tbody>
          {scales.map((s, i) => (
            <tr key={`${i}-${s.multiplier}-${s.yieldUnits}`} className="border-b border-slate-200/90 align-top">
              <td className="py-1.5 pr-2">{s.multiplier}×</td>
              <td className="py-1.5 pr-2 tabular-nums">{s.yieldUnits}</td>
              <td className="py-1.5 pr-2 tabular-nums">${s.totalCost.toFixed(2)}</td>
              <td className="py-1.5 pr-2 tabular-nums">${s.revenueAt.toFixed(2)}</td>
              <td className="py-1.5 pr-2 tabular-nums text-emerald-800 print:text-black">
                ${s.profit.toFixed(2)}
              </td>
              <td className="py-1.5 text-xs text-slate-600">
                {Object.entries(s.ingredientAmounts)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tierOrder: LumpiaMarginRow["tier"][] = [
  "1 Dozen",
  "2 Dozen",
  "Party Tray (50 pcs)",
];

const proteinOrder: LumpiaMarginRow["protein"][] = ["pork", "turkey", "beef"];

function MarginsLumpia({ r }: { r: Recipe }) {
  if (!r.variants?.length) return null;
  const all = lumpiaMarginDisplayRows(r, r.variants);
  all.sort(
    (a, b) =>
      proteinOrder.indexOf(a.protein) - proteinOrder.indexOf(b.protein) ||
      tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );
  return (
    <div className="mb-6 rounded-lg border border-amber-200/80 bg-amber-50/40 p-4 print:border print:bg-white">
      <h3 className="text-sm font-bold uppercase tracking-wide text-[color:var(--primary)] print:text-black">
        Margins vs. menu (from menu catalog + lumpia list tiers)
      </h3>
      <p className="mb-2 text-xs text-slate-600 print:text-slate-700">
        COGS is prorated from the 50-pc batch recipe. Sell prices:{" "}
        <code className="text-[11px]">LUMPIA_RETAIL_TIERS_USD</code> (cooked and frozen
        same per tier).
      </p>
      <ul className="space-y-1 text-sm text-slate-800">
        {all.map((row) => (
          <li key={row.id} className="pl-0 leading-relaxed print:text-sm">
            {row.oneLine}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MarginsAdobo() {
  const rows = adoboMarginDisplayRows();
  if (!rows.length) return null;
  return (
    <div className="mb-6 rounded-lg border border-amber-200/80 bg-amber-50/40 p-4 print:border print:bg-white">
      <h3 className="text-sm font-bold uppercase tracking-wide text-[color:var(--primary)] print:text-black">
        Margins vs. menu (from <code>ADOBO_RETAIL_USD</code> + recipe COGS)
      </h3>
      <ul className="mt-2 space-y-1 text-sm text-slate-800">
        {rows.map((row) => (
          <li key={row.id} className="pl-0 leading-relaxed print:text-sm">
            {row.oneLine}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MarginsFlan({ r }: { r: Recipe }) {
  if (r.id !== "leche-flan") return null;
  const rows = flanMarginDisplayRows(r);
  if (!rows.length) return null;
  return (
    <div className="mb-6 rounded-lg border border-amber-200/80 bg-amber-50/40 p-4 print:border print:bg-white">
      <h3 className="text-sm font-bold uppercase tracking-wide text-[color:var(--primary)] print:text-black">
        Margins vs. individual ramekin list price
      </h3>
      <p className="mb-2 text-xs text-slate-600 print:text-slate-700">
        Ramekin retail from <code>FLAN_RETAIL_PER_RAMEKIN_USD</code> in{" "}
        <code>flan-cost-model</code> (matches <code>seed-6</code> in the catalog).
      </p>
      <ul className="space-y-1 text-sm text-slate-800">
        {rows.map((row) => (
          <li key={row.label} className="pl-0 leading-relaxed print:text-sm">
            {row.oneLine}
          </li>
        ))}
      </ul>
    </div>
  );
}

function menuAnchor(r: Recipe) {
  const row = MENU_CATALOG.find((c) => c.id === r.menuItemId);
  if (!row) {
    return (
      <p className="text-xs text-slate-500">
        Menu: <code>{r.menuItemId}</code> (row not found in catalog)
      </p>
    );
  }
  return (
    <p className="text-xs text-slate-500">
      Menu: {row.name} — <code>{r.menuItemId}</code>
    </p>
  );
}

export function RecipeContent({
  r,
  showMargins = true,
}: {
  r: Recipe;
  showMargins?: boolean;
}) {
  const sharedSub = sharedIngredientsCostExcludingVariants(r);

  return (
    <article className="recipe-prose text-slate-800">
      <header className="mb-4 border-b border-amber-200/90 pb-4 print:border-amber-900/20">
        <h1 className="text-2xl font-bold text-[color:var(--primary)] print:text-3xl print:text-black">
          {r.title}
        </h1>
        <p className="text-base text-slate-600 print:text-slate-800">{r.subtitle}</p>
        {menuAnchor(r)}
        <dl className="mt-3 flex flex-wrap gap-4 text-sm print:text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Yield</dt>
            <dd>
              {r.yieldDescription} <span className="text-slate-500">({r.yieldUnits} units)</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Active / total time</dt>
            <dd>
              {r.activeTimeMinutes} min / {r.totalTimeMinutes} min
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Last updated</dt>
            <dd>{new Date(r.lastUpdated).toLocaleString()}</dd>
          </div>
        </dl>
      </header>

      {(r.id === "lumpia" || r.id === "adobo") && r.variants && (
        <p className="mb-2 text-sm text-slate-600 print:text-slate-800">
          Base ingredients (shared, no meat) subtotal:{" "}
          <strong className="tabular-nums text-slate-800">${sharedSub.toFixed(2)}</strong>
        </p>
      )}

      <h2 className="mb-2 text-lg font-bold text-[color:var(--primary)] print:mt-0 print:text-black print:text-[18pt]">
        Ingredients
      </h2>
      <IngredientTable
        rows={r.ingredients}
        caption="All amounts are for the yield above unless a variant is noted."
      />

      {r.id === "lumpia" && r.variants
        ? r.variants.map((v) => {
            const full = batchCostForLumpiaVariant(r, v);
            return (
              <div key={v.label} className="mb-6 break-inside-avoid print:mb-4">
                <h3 className="mb-1 text-base font-semibold text-slate-900 print:text-[14pt]">
                  {v.label}
                </h3>
                <VariantOverrideTable v={v} meatOnly />
                <p className="text-sm text-slate-800">
                  <span className="font-semibold">50-pc batch total (incl. protein + shared):</span>{" "}
                  <span className="tabular-nums text-lg text-emerald-800 print:text-black print:text-base">
                    ${full.toFixed(2)}
                  </span>
                </p>
              </div>
            );
          })
        : null}
      {r.id === "adobo" && r.variants
        ? r.variants.map((v) => {
            const full = batchCostForLumpiaVariant(r, v);
            return (
              <div key={v.label} className="mb-6 break-inside-avoid print:mb-4">
                <h3 className="mb-1 text-base font-semibold text-slate-900 print:text-[14pt]">
                  {v.label}
                </h3>
                <VariantOverrideTable v={v} meatOnly />
                <p className="text-sm text-slate-800">
                  <span className="font-semibold">1 plate total (incl. protein + shared):</span>{" "}
                  <span className="tabular-nums text-lg text-emerald-800 print:text-black print:text-base">
                    ${full.toFixed(2)}
                  </span>
                </p>
              </div>
            );
          })
        : null}

      {r.scaling?.length ? (
        <ScalesTable
          scales={r.scaling}
          caption={
            r.id === "adobo"
              ? "Party tray economics (8–10 servings; list from menu $55.00; chicken vs. pork cost)"
              : undefined
          }
          yieldColumnLabel={r.id === "adobo" ? "Servings (est.)" : undefined}
        />
      ) : null}

      <h2 className="mb-2 mt-6 text-lg font-bold text-[color:var(--primary)] print:text-[18pt] print:text-black">
        Method
      </h2>
      <ol className="ml-4 list-outside list-decimal space-y-2 text-sm leading-relaxed text-slate-800 print:ml-5 print:space-y-1.5 print:text-[11pt]">
        {r.method.map((step, i) => (
          <li key={i} className="pl-1">
            {step}
          </li>
        ))}
      </ol>

      {r.notes ? (
        <section className="mt-6 break-inside-avoid rounded-lg border border-slate-200/90 bg-slate-50/80 p-4 text-sm text-slate-800 print:mt-4 print:border-slate-400/40 print:bg-white">
          <h2 className="mb-1 text-base font-bold text-[color:var(--primary)] print:text-[14pt] print:text-black">
            Chef notes
          </h2>
          <p className="whitespace-pre-line leading-relaxed">{r.notes}</p>
        </section>
      ) : null}

      {showMargins
        ? r.id === "lumpia" && r.variants
          ? <MarginsLumpia r={r} />
          : r.id === "adobo"
            ? <MarginsAdobo />
            : r.id === "leche-flan"
              ? <MarginsFlan r={r} />
              : null
        : null}
    </article>
  );
}

export function MasterRecipeCover({ recipeCount }: { recipeCount: number }) {
  return (
    <header
      className="mb-10 flex min-h-[70vh] flex-col items-center justify-center text-center print:break-after-page"
    >
      <h1
        className="text-4xl font-extrabold text-[color:var(--primary)] print:text-5xl print:text-black"
        style={{ fontFamily: "var(--font-heading, inherit)" }}
      >
        Mr. K&apos;s Filipino Kitchen
      </h1>
      <p className="mt-3 text-2xl font-semibold text-amber-800 print:text-black">Master Recipe Book</p>
      <p className="mt-2 text-sm text-slate-600 print:text-slate-700">Admin use only — {recipeCount} recipes</p>
      <p className="mt-8 text-xs text-slate-500">Printed {new Date().toLocaleString()}</p>
    </header>
  );
}
