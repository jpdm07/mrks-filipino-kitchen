import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { listRecipeBaseCostLabel } from "@/lib/recipe-margins";
import { RECIPES } from "@/lib/recipes";
import { MENU_CATALOG } from "@/lib/menu-catalog";

export const metadata = {
  title: "Recipes (admin) — Mr. K's",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminRecipesListPage() {
  await requireAdmin();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 border-b border-amber-200/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--primary)]">Master recipes & cost</h1>
          <p className="mt-1 text-sm text-slate-600">
            Canonical batch recipes, ingredient costs, and margin checks vs. current menu list prices.{" "}
            <span className="text-slate-500">(Never shown to customers.)</span>
          </p>
        </div>
        <div className="shrink-0 print:hidden">
          <Link
            href="/admin/recipes/print?book=1"
            target="_blank"
            className="inline-flex rounded-lg border-2 border-[color:var(--primary)] bg-[color:var(--primary)]/5 px-4 py-2.5 text-sm font-bold text-[color:var(--primary)] shadow-sm transition hover:bg-[color:var(--primary)]/10"
          >
            Download master recipe book (print view)
          </Link>
        </div>
      </div>

      <p className="mb-6 text-xs text-slate-500 print:hidden">
        For PDF: open <strong>Master recipe book</strong> (link above) in a new tab, then print or
        &quot;Save as PDF&quot; in your browser.
      </p>

      <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {RECIPES.map((r) => {
          const menu = MENU_CATALOG.find((c) => c.id === r.menuItemId);
          return (
            <li key={r.id}>
              <Link
                href={`/admin/recipes/${r.id}`}
                className="block h-full rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-amber-300/80 hover:shadow-md"
              >
                <h2 className="text-lg font-bold text-[color:var(--primary)]">{r.title}</h2>
                <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">{r.subtitle}</p>
                <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Yield</dt>
                    <dd className="text-slate-800">{r.yieldDescription}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Est. cost</dt>
                    <dd className="font-medium tabular-nums text-slate-900">
                      {listRecipeBaseCostLabel(r)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase text-slate-500">Menu link</dt>
                    <dd className="text-slate-700">
                      {menu ? menu.name : "—"}{" "}
                      <span className="text-slate-400">({r.menuItemId})</span>
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase text-slate-500">Last updated</dt>
                    <dd className="text-slate-700">
                      {new Date(r.lastUpdated).toLocaleDateString(undefined, {
                        dateStyle: "long",
                      })}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm font-medium text-amber-900/90">View recipe →</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
