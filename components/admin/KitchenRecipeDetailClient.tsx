"use client";

import { useMemo, useState } from "react";
import type { KitchenRecipeIngredientsPayload } from "@/lib/kitchen-recipe-types";
import { formatScaledLine } from "@/lib/kitchen-recipe-types";

type Props = {
  name: string;
  category: string;
  baseServings: number;
  ingredients: KitchenRecipeIngredientsPayload;
  instructions: string[];
  notes: string | null;
};

export function KitchenRecipeDetailClient({
  name,
  category,
  baseServings,
  ingredients,
  instructions,
  notes,
}: Props) {
  const [servings, setServings] = useState(baseServings);

  const safeBase = Math.max(1, baseServings);
  const safeServings = Math.min(
    500,
    Math.max(1, Math.floor(Number.isFinite(servings) ? servings : safeBase))
  );

  const scaledSections = useMemo(() => {
    return ingredients.sections.map((sec) => ({
      heading: sec.heading,
      lines: sec.lines.map((line) =>
        formatScaledLine(line, safeBase, safeServings)
      ),
    }));
  }, [ingredients.sections, safeBase, safeServings]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 print:hidden sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            Servings
            <input
              type="number"
              min={1}
              max={500}
              className="w-24 rounded border border-slate-300 px-2 py-1 font-normal tabular-nums"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value, 10) || 1)}
            />
          </label>
          <span className="text-xs text-slate-600">
            Baseline lock: <strong>{safeBase}</strong> servings · scale factor{" "}
            <strong className="tabular-nums">
              {(safeServings / safeBase).toFixed(4).replace(/\.?0+$/, "")}
            </strong>
          </span>
        </div>
        <button
          type="button"
          className="inline-flex rounded-lg border-2 border-[color:var(--primary)] bg-[color:var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
          onClick={() => window.print()}
        >
          Print scaled recipe
        </button>
      </div>

      <div
        id="kitchen-recipe-print"
        className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm print:border-0 print:shadow-none"
      >
        <header className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Kitchen recipe · {category}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-2xl font-bold text-[color:var(--primary)]">
            {name}
          </h1>
          <p className="mt-2 text-sm text-slate-700">
            Scaled for <strong>{safeServings}</strong> servings (master baseline{" "}
            <strong>{safeBase}</strong>).
          </p>
          {notes ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{notes}</p>
          ) : null}
        </header>

        <section className="mt-6">
          <h2 className="text-lg font-bold text-slate-900">Ingredients</h2>
          <div className="mt-3 space-y-6">
            {scaledSections.map((sec) => (
              <div key={sec.heading}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900/90">
                  {sec.heading}
                </h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-800">
                  {sec.lines.map((line, i) => (
                    <li key={`${sec.heading}-${i}`}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 print:break-inside-avoid">
          <h2 className="text-lg font-bold text-slate-900">Instructions</h2>
          <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-800">
            {instructions.map((step, i) => (
              <li key={i} className="pl-1">
                {step}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
