import type { KitchenRecipeIngredientsPayload } from "@/lib/kitchen-recipe-types";

export const CHICKEN_PANCIT_RECIPE_ID = "kitchen-chicken-pancit-40";
export const SHRIMP_PANCIT_RECIPE_ID = "kitchen-shrimp-pancit-40";

export const BASE_SERVINGS_PANCIT = 40;

/** Ingredient amounts are for exactly 40 servings (8 oz sampler cups baseline). */
export const CHICKEN_PANCIT_INGREDIENTS: KitchenRecipeIngredientsPayload = {
  sections: [
    {
      heading: "Noodles",
      lines: [
        {
          label: "Rice vermicelli / bihon",
          amount: 52.8,
          unit: "oz dry (6 × 8.8 oz bags)",
          note: "Soak in cold water 10 min before cooking — do not use hot water.",
        },
      ],
    },
    {
      heading: "Protein",
      lines: [
        {
          label: "Boneless chicken thighs",
          amount: 4,
          unit: "lbs",
          note: "Poach, shred, save all broth.",
        },
      ],
    },
    {
      heading: "Aromatics",
      lines: [
        {
          label: "Garlic, minced",
          amount: 20,
          unit: "cloves (~2 heads)",
          note: "For cooking base.",
        },
        {
          label: "Garlic, sliced thin",
          amount: 3,
          unit: "heads",
          note: "For garlic crisps garnish (fry day-of).",
        },
        {
          label: "White or yellow onion, diced",
          amount: 3,
          unit: "large",
        },
      ],
    },
    {
      heading: "Vegetables",
      lines: [
        {
          label: "Cabbage, thinly sliced",
          amount: 2,
          unit: "lbs (~1 large head)",
        },
        {
          label: "Matchstick/shredded carrots",
          amount: 11,
          unit: "oz (1 bag pre-cut; range 10–12 oz)",
        },
        {
          label: "Celery, sliced thin",
          amount: 4,
          unit: "stalks",
          note: "Optional.",
        },
      ],
    },
    {
      heading: "Sauce & seasoning",
      lines: [
        {
          label: "Soy sauce",
          amount: 1.5,
          unit: "cups",
        },
        {
          label: "Fish sauce (patis)",
          amount: 0.5,
          unit: "cup",
        },
        {
          label: "Oyster sauce",
          amount: 0.25,
          unit: "cup",
        },
        {
          label: "Ground black pepper",
          amount: 1,
          unit: "tsp",
        },
        {
          label: "Vegetable or canola oil",
          amount: 0.25,
          unit: "cup",
        },
        {
          label:
            "Chicken poaching broth (or boosted with 4 bouillon cubes if poached plain)",
          amount: 5,
          unit: "cups (use all poaching broth; ~4–6 cups typical)",
          note: "Dissolve bouillon into broth if boosting.",
        },
      ],
    },
    {
      heading: "Garnish (per cup at service — scales with batch)",
      lines: [
        {
          label: "Green onions/scallions, sliced",
          amount: 1,
          unit: "bunch",
        },
        {
          label: "Lime wedges",
          amount: 10,
          unit: "limes (quarter each = 40 wedges, 1 per cup)",
        },
        {
          label: "Garlic crisps",
          amount: null,
          unit: "From the 3 heads sliced garlic above",
        },
      ],
    },
  ],
};

export const CHICKEN_PANCIT_INSTRUCTIONS: string[] = [
  "Boost the broth — Dissolve 4 bouillon cubes into poaching broth. Heat until dissolved. Keep warm.",
  "Shred chicken & make sauce mix — Shred chicken thighs. Combine soy sauce, fish sauce, oyster sauce, and pepper in a bowl. Stir and set aside.",
  "Soak noodles — Soak all bihon in cold water exactly 10 minutes. Drain. Do not use hot water.",
  "Cook in batches (4–5 batches) — do not overcrowd — Heat wide pan/wok over medium-high. Oil, then sauté garlic 30 sec. Add onion until soft. Add cabbage and carrots, stir-fry 2 min. Add noodles, ladle in broth, pour in portion of sauce mix. Toss with tongs. Add chicken. Cook until noodles absorb most liquid — pull while slightly underdone if making ahead. Transfer to foil pan.",
  "Combine all batches & taste — Toss together. Adjust salt with soy sauce. Cool completely if making ahead. Cover tightly and refrigerate. Reserve 1–2 cups broth separately.",
  "If making ahead — reheat morning of — Pour reserved broth over cold pancit. Cover with foil. Reheat at 325°F for 25–30 min or stovetop on medium-low. Toss gently. Taste and adjust.",
  "Fry garlic crisps (day of) — Halve cloves lengthwise, slice thin. Shallow fry in oil over medium-low. Pull when light golden. Drain on paper towel. Salt lightly. Store uncovered at room temp.",
  "Plate into cups — Fill 8oz cups ¾ full. Top with garlic crisps, green onion, lime wedge. Cover and serve.",
];

function shrimpSauceSection(
  sections: KitchenRecipeIngredientsPayload["sections"]
): KitchenRecipeIngredientsPayload["sections"] {
  return sections.map((sec) => {
    if (sec.heading !== "Sauce & seasoning") return sec;
    return {
      ...sec,
      lines: sec.lines.map((line) =>
        line.label.includes("Chicken poaching broth")
          ? {
              label:
                "Shrimp stock or chicken broth (boost with bouillon cubes if needed)",
              amount: 5,
              unit: "cups (~4–6 cups typical)",
              note: "Use shrimp stock when available.",
            }
          : line
      ),
    };
  });
}

export const SHRIMP_PANCIT_INGREDIENTS: KitchenRecipeIngredientsPayload = {
  sections: shrimpSauceSection([
    CHICKEN_PANCIT_INGREDIENTS.sections[0],
    {
      heading: "Protein",
      lines: [
        {
          label: "Shrimp (peeled, deveined)",
          amount: 4,
          unit: "lbs",
          note: "Sauté in batches, set aside; use shrimp stock or chicken broth as liquid. Add shrimp at the end so it doesn’t overcook.",
        },
      ],
    },
    ...CHICKEN_PANCIT_INGREDIENTS.sections.slice(2),
  ]),
};

export const SHRIMP_PANCIT_INSTRUCTIONS: string[] = [
  "Boost the broth — Use shrimp stock or chicken broth (if needed, dissolve bouillon cubes). Heat until dissolved / warm.",
  "Prep shrimp & sauce mix — Combine soy sauce, fish sauce, oyster sauce, and pepper in a bowl. Stir and set aside.",
  "Soak noodles — Soak all bihon in cold water exactly 10 minutes. Drain. Do not use hot water.",
  "Cook shrimp separately — Sauté shrimp in batches just until opaque; set aside (do not overcook).",
  "Cook in batches (4–5 batches) — do not overcrowd — Heat wide pan/wok over medium-high. Oil, then sauté garlic 30 sec. Add onion until soft. Add cabbage and carrots, stir-fry 2 min. Add noodles, ladle in broth (shrimp stock or chicken broth), pour in portion of sauce mix. Toss with tongs. Cook until noodles absorb most liquid — pull while slightly underdone if making ahead. Transfer to foil pan. Fold cooked shrimp in at the very end.",
  "Combine all batches & taste — Toss together. Adjust salt with soy sauce. Cool completely if making ahead. Cover tightly and refrigerate. Reserve 1–2 cups broth separately.",
  "If making ahead — reheat morning of — Pour reserved broth over cold pancit. Cover with foil. Reheat at 325°F for 25–30 min or stovetop on medium-low. Toss gently. Taste and adjust.",
  "Fry garlic crisps (day of) — Halve cloves lengthwise, slice thin. Shallow fry in oil over medium-low. Pull when light golden. Drain on paper towel. Salt lightly. Store uncovered at room temp.",
  "Plate into cups — Fill 8oz cups ¾ full. Top with garlic crisps, green onion, lime wedge. Cover and serve.",
];

export const CHICKEN_PANCIT_NOTES =
  "Master batch — 40 servings (8 oz sampler cups). All scaling is proportional from this baseline.";

export const SHRIMP_PANCIT_NOTES =
  "Same batch as chicken pancit except protein and cooking order: sauté shrimp separately and add at the end; use shrimp stock or chicken broth for liquid.";
