import Link from "next/link";
import { notFound } from "next/navigation";
import { KitchenRecipeDetailClient } from "@/components/admin/KitchenRecipeDetailClient";
import { requireAdmin } from "@/lib/admin-auth";
import type { KitchenRecipeIngredientsPayload } from "@/lib/kitchen-recipe-types";
import { prisma } from "@/lib/prisma";

export const metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function parseIngredients(raw: unknown): KitchenRecipeIngredientsPayload {
  if (!raw || typeof raw !== "object") return { sections: [] };
  const o = raw as { sections?: unknown };
  if (!Array.isArray(o.sections)) return { sections: [] };
  return { sections: o.sections as KitchenRecipeIngredientsPayload["sections"] };
}

function parseInstructions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export default async function AdminKitchenRecipePage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const id = decodeURIComponent(params.id).trim();
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) notFound();

  const ingredients = parseIngredients(recipe.ingredients);
  const instructions = parseInstructions(recipe.instructions);

  return (
    <div>
      <div className="mb-4 print:hidden">
        <Link
          href="/admin/recipes"
          className="text-sm font-medium text-amber-900/90 hover:underline"
        >
          ← All recipes
        </Link>
      </div>
      <KitchenRecipeDetailClient
        name={recipe.name}
        category={recipe.category}
        baseServings={recipe.baseServings}
        ingredients={ingredients}
        instructions={instructions}
        notes={recipe.notes}
      />
    </div>
  );
}
