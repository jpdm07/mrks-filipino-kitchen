import type { PrismaClient } from "@prisma/client";
import {
  BASE_SERVINGS_PANCIT,
  CHICKEN_PANCIT_INGREDIENTS,
  CHICKEN_PANCIT_INSTRUCTIONS,
  CHICKEN_PANCIT_NOTES,
  CHICKEN_PANCIT_RECIPE_ID,
  SHRIMP_PANCIT_INGREDIENTS,
  SHRIMP_PANCIT_INSTRUCTIONS,
  SHRIMP_PANCIT_NOTES,
  SHRIMP_PANCIT_RECIPE_ID,
} from "@/lib/pancit-master-recipes";

/** Upserts scalable kitchen recipes (Chicken Pancit + Shrimp Pancit baseline). */
export async function upsertKitchenRecipes(prisma: PrismaClient): Promise<void> {
  await prisma.recipe.upsert({
    where: { id: CHICKEN_PANCIT_RECIPE_ID },
    create: {
      id: CHICKEN_PANCIT_RECIPE_ID,
      name: "Chicken Pancit — sampler cups (master)",
      category: "chicken",
      baseServings: BASE_SERVINGS_PANCIT,
      ingredients: CHICKEN_PANCIT_INGREDIENTS as object,
      instructions: CHICKEN_PANCIT_INSTRUCTIONS as object,
      notes: CHICKEN_PANCIT_NOTES,
      isActive: true,
    },
    update: {
      name: "Chicken Pancit — sampler cups (master)",
      category: "chicken",
      baseServings: BASE_SERVINGS_PANCIT,
      ingredients: CHICKEN_PANCIT_INGREDIENTS as object,
      instructions: CHICKEN_PANCIT_INSTRUCTIONS as object,
      notes: CHICKEN_PANCIT_NOTES,
      isActive: true,
    },
  });

  await prisma.recipe.upsert({
    where: { id: SHRIMP_PANCIT_RECIPE_ID },
    create: {
      id: SHRIMP_PANCIT_RECIPE_ID,
      name: "Shrimp Pancit — sampler cups (master)",
      category: "shrimp",
      baseServings: BASE_SERVINGS_PANCIT,
      ingredients: SHRIMP_PANCIT_INGREDIENTS as object,
      instructions: SHRIMP_PANCIT_INSTRUCTIONS as object,
      notes: SHRIMP_PANCIT_NOTES,
      isActive: true,
    },
    update: {
      name: "Shrimp Pancit — sampler cups (master)",
      category: "shrimp",
      baseServings: BASE_SERVINGS_PANCIT,
      ingredients: SHRIMP_PANCIT_INGREDIENTS as object,
      instructions: SHRIMP_PANCIT_INSTRUCTIONS as object,
      notes: SHRIMP_PANCIT_NOTES,
      isActive: true,
    },
  });
}
