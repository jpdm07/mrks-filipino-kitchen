import { notFound } from "next/navigation";
import { RecipeContent, MasterRecipeCover } from "@/components/admin/RecipeContent";
import { RecipePrintControls } from "@/components/admin/RecipePrintControls";
import { requireAdmin } from "@/lib/admin-auth";
import { getRecipeById, RECIPES } from "@/lib/recipes";

export const metadata = {
  title: "Print recipes (admin) — Mr. K's",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Search = { book?: string; recipe?: string };

function parseSearch(sp: Search) {
  const book = sp.book === "1" || sp.book === "true" || sp.book === "all";
  const id = sp.recipe?.trim() || "";
  return { book, id };
}

export default async function AdminRecipesPrintPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  await requireAdmin();
  const { book, id } = parseSearch(searchParams);

  if (book) {
    return (
      <div>
        <RecipePrintControls
          backHref="/admin/recipes"
          bookHref="/admin/recipes/print?book=1"
          singleLabel="Recipe list"
        />
        <MasterRecipeCover recipeCount={RECIPES.length} />
        {RECIPES.map((r, i) => (
          <div
            key={r.id}
            className={
              i < RECIPES.length - 1
                ? "mb-10 print:mb-0 print:break-after-page"
                : "print:break-inside-avoid"
            }
          >
            <RecipeContent r={r} showMargins />
            {i < RECIPES.length - 1 ? (
              <hr className="my-8 print:hidden" />
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (id) {
    const r = getRecipeById(id);
    if (!r) {
      notFound();
    }
    return (
      <div>
        <RecipePrintControls
          backHref={`/admin/recipes/${r.id}`}
          bookHref="/admin/recipes/print?book=1"
        />
        <RecipeContent r={r} showMargins />
      </div>
    );
  }

  return (
    <div>
      <RecipePrintControls
        backHref="/admin/recipes"
        bookHref="/admin/recipes/print?book=1"
        singleLabel="Recipe list"
      />
      <p className="text-slate-700 print:hidden">
        Add <code className="rounded bg-slate-100 px-1.5">?book=1</code> for the full book, or{" "}
        <code className="rounded bg-slate-100 px-1.5">?recipe=lumpia</code> /{" "}
        <code className="rounded bg-slate-100 px-1.5">?recipe=leche-flan</code> for a single
        recipe.
      </p>
    </div>
  );
}
