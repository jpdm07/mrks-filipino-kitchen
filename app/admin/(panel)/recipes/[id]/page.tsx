import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeContent } from "@/components/admin/RecipeContent";
import { RecipePrintControls } from "@/components/admin/RecipePrintControls";
import { requireAdmin } from "@/lib/admin-auth";
import { getRecipeById } from "@/lib/recipes";

export const metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function AdminRecipeDetailPage({ params }: Props) {
  await requireAdmin();
  const r = getRecipeById(params.id);
  if (!r) notFound();

  return (
    <div>
      <div className="mb-2 print:hidden">
        <Link
          href="/admin/recipes"
          className="text-sm font-medium text-amber-900/90 hover:underline"
        >
          ← All recipes
        </Link>
      </div>
      <RecipePrintControls
        backHref="/admin/recipes"
        bookHref="/admin/recipes/print?book=1"
        printViewHref={`/admin/recipes/print?recipe=${encodeURIComponent(r.id)}`}
        printViewLabel="Print layout (this recipe only)"
        singleLabel="All recipes"
      />
      <RecipeContent r={r} showMargins />
    </div>
  );
}
