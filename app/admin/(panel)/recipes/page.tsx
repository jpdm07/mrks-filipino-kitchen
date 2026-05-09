import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { listRecipeBaseCostLabel } from "@/lib/recipe-margins";
import { RECIPES } from "@/lib/recipes";
import { MENU_CATALOG } from "@/lib/menu-catalog";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Recipes (admin) — Mr. K's",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminRecipesListPage() {
  await requireAdmin();

  const kitchenRecipes = await prisma.recipe.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      baseServings: true,
      notes: true,
      updatedAt: true,
    },
  });

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

      <h2 className="mb-3 mt-10 text-lg font-bold text-[color:var(--primary)]">
        Cost & margin recipes (spreadsheet-backed)
      </h2>
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

      <h2 className="mb-3 mt-12 text-lg font-bold text-[color:var(--primary)]">
        Scalable kitchen recipes (serving calculator)
      </h2>
      <p className="mb-4 text-sm text-slate-600">
        Baseline batches saved in the database — adjust servings on each recipe page; print a scaled
        ingredient list for prep.
      </p>
      {kitchenRecipes.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          No scalable recipes in the database yet. Run{" "}
          <code className="rounded bg-black/5 px-1">npx prisma db seed</code> locally (production{" "}
          <code className="rounded bg-black/5 px-1">DATABASE_URL</code> in{" "}
          <code className="rounded bg-black/5 px-1">.env.local</code>) to load Chicken &amp; Shrimp
          Pancit masters.
        </p>
      ) : (
      <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {kitchenRecipes.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/recipes/kitchen/${encodeURIComponent(r.id)}`}
              className="block h-full rounded-xl border border-emerald-200/90 bg-emerald-50/40 p-5 shadow-sm transition hover:border-emerald-400/80 hover:shadow-md"
            >
              <h2 className="text-lg font-bold text-[color:var(--primary)]">{r.name}</h2>
              <p className="mt-1 text-sm capitalize text-slate-600">{r.category}</p>
              <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Baseline servings</dt>
                  <dd className="text-slate-800">{r.baseServings}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-slate-500">Last updated</dt>
                  <dd className="text-slate-700">
                    {new Date(r.updatedAt).toLocaleDateString(undefined, {
                      dateStyle: "long",
                    })}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-sm font-medium text-emerald-900/90">Open calculator →</p>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
