/**
 * Admin-only kitchen recipes & batch economics — never exposed to the public site.
 * Menu list prices: `lib/menu-catalog.ts` + `lumpia-cost-model` / `flan-cost-model`.
 */

export type Ingredient = {
  name: string;
  amount: string;
  unitCost: number;
  source?: string;
  notes?: string;
};

export type BatchScale = {
  multiplier: number;
  ingredientAmounts: Record<string, string>;
  yieldUnits: number;
  totalCost: number;
  revenueAt: number;
  profit: number;
};

export type RecipeVariant = {
  label: string;
  ingredientOverrides: Partial<Ingredient>[];
  totalCostOverride?: number;
};

export type Recipe = {
  id: string;
  /** `MENU_CATALOG` id. Lumpia: use pork row as anchor (`seed-2`); list prices for beef/turkey come from `LUMPIA_RETAIL_TIERS_USD`. */
  menuItemId: string;
  title: string;
  subtitle: string;
  yieldDescription: string;
  yieldUnits: number;
  activeTimeMinutes: number;
  totalTimeMinutes: number;
  ingredients: Ingredient[];
  method: string[];
  notes?: string;
  scaling?: BatchScale[];
  variants?: RecipeVariant[];
  lastUpdated: string;
};

const BASE_LUMPIA_SHARED: Ingredient[] = [
  { name: "Lumpia wrappers (50-pc full pack, 125×125mm)", amount: "1 pack (50)", unitCost: 7, source: "H-Mart Katy" },
  { name: "Large eggs (binder)", amount: "3", unitCost: 0.87, source: "Kroger" },
  { name: "Shredded carrots", amount: "½ bag", unitCost: 0.75, source: "Kroger" },
  { name: "Celery, finely diced", amount: "1 stalk", unitCost: 0.3, source: "Kroger" },
  { name: "Onion, finely diced", amount: "¼ medium", unitCost: 0.25, source: "Kroger" },
  { name: "Magic Sarap seasoning", amount: "1 pinch", unitCost: 0.1, source: "Asian aisle" },
  { name: "Salt", amount: "~1 tsp", unitCost: 0.1, source: "pantry" },
  { name: "Black pepper", amount: "~1 tsp", unitCost: 0.15, source: "pantry" },
  { name: "Garlic powder", amount: "1 tsp", unitCost: 0.1, source: "pantry" },
  { name: "Onion powder", amount: "1 tsp", unitCost: 0.15, source: "pantry" },
  { name: "Cornstarch (binder)", amount: "3 tbsp", unitCost: 0.15, source: "pantry" },
  { name: "Vegetable oil (fry)", amount: "~2 cups", unitCost: 1.5, source: "Kroger" },
  { name: "Dipping sauce + 4 small containers", amount: "1 set", unitCost: 2, source: "" },
  { name: "Foil tray + lid (party tray where used)", amount: "1", unitCost: 3.5, source: "Kroger / Dollar Tree" },
];

export const RECIPES: Recipe[] = [
  {
    id: "lumpia",
    menuItemId: "seed-2",
    title: "Lumpia",
    subtitle: "Hand-rolled Filipino spring rolls — party-size",
    yieldDescription: "50 pieces (one batch; protein variant)",
    yieldUnits: 50,
    activeTimeMinutes: 180,
    totalTimeMinutes: 240,
    lastUpdated: "2026-04-22T12:00:00.000Z",
    ingredients: BASE_LUMPIA_SHARED,
    variants: [
      {
        label: "Pork",
        totalCostOverride: 21.91,
        ingredientOverrides: [
          { name: "Ground pork", amount: "1 lb @ $4.99/lb", unitCost: 4.99, source: "Kroger" },
        ],
      },
      {
        label: "Turkey",
        totalCostOverride: 21.91,
        ingredientOverrides: [
          { name: "Ground turkey", amount: "1 lb @ $4.99/lb", unitCost: 4.99, source: "Kroger" },
        ],
      },
      {
        label: "Beef",
        totalCostOverride: 23.25,
        ingredientOverrides: [
          { name: "Ground beef 80/20", amount: "1 lb @ $6.33/lb", unitCost: 6.33, source: "Kroger" },
        ],
      },
    ],
    method: [
      "Mix the filling. Combine ground meat, finely diced onion, celery, shredded carrots, eggs, cornstarch, salt, pepper, garlic powder, onion powder, and Magic Sarap in a large bowl. Mix thoroughly with clean hands until everything is evenly distributed. Texture should be cohesive but not stiff.",
      "Test-cook a tiny pinch. Microwave a ¼ tsp of filling for 10 seconds and taste. Adjust salt or seasoning before rolling — once rolled, you can't fix it.",
      "Set up rolling station. Lay out 6–10 wrappers on a clean silicone pastry mat. Have a small bowl of water or beaten egg white nearby for sealing.",
      "Roll each lumpia. Place ~1 to 1½ tablespoons of filling along one edge of the wrapper, shaped into a thin log. Fold the bottom edge over the filling, fold both sides in tightly, then roll up tightly toward the opposite corner. Seal the final edge with a dab of water/egg.",
      "Refrigerate before frying. Chill rolled lumpia for at least 15–20 minutes — this firms them up and helps them hold together in the oil.",
      "Fry. Heat vegetable oil in a deep pan or pot to 350°F. Fry lumpia in small batches for 3–4 minutes, turning occasionally, until golden and crisp on all sides. Drain on a wire rack (not paper towels — they go soggy).",
      "For frozen orders: skip frying. Lay rolled lumpia in a single layer on a tray, freeze solid (~2 hrs), then transfer to ziploc bags. Label with date and protein.",
    ],
    notes:
      "Always use full-size 125×125mm wrappers — this is what differentiates us from cocktail-size cafe lumpia. Vegetable oil reused 2–3 times max, then strained and stored in the fridge between uses. Always freeze raw lumpia in a single layer first before bagging, otherwise they stick.",
  },
  {
    id: "leche-flan",
    menuItemId: "seed-6",
    title: "Leche Flan",
    subtitle: "Slow-steamed Filipino caramel egg custard",
    yieldDescription: "8 ramekins (~4.5 oz each)",
    yieldUnits: 8,
    activeTimeMinutes: 30,
    totalTimeMinutes: 90,
    lastUpdated: "2026-04-22T12:00:00.000Z",
    ingredients: [
      { name: "Large eggs", amount: "3", unitCost: 0.87, source: "Kroger" },
      { name: "Sweetened condensed milk (Eagle Brand, 14 oz)", amount: "1 can", unitCost: 2.79, source: "Kroger" },
      { name: "Evaporated milk (Carnation, 12 oz)", amount: "1 can", unitCost: 1.99, source: "Kroger" },
      { name: "Vanilla extract", amount: "1 tsp", unitCost: 0.35, source: "Kroger" },
      { name: "Salt", amount: "1 pinch", unitCost: 0.02, source: "pantry" },
      { name: "Granulated sugar (caramel)", amount: "1 cup", unitCost: 0.3, source: "Kroger" },
      { name: "5 oz ramekin + lid (Findful-style)", amount: "8", unitCost: 3.6, source: "Amazon bulk ($0.45 ea)", notes: "Rounded from pack pricing" },
      { name: "Sticker labels (Mr. K's, printed in-house)", amount: "8", unitCost: 0.4, source: "own supply" },
    ],
    method: [
      "Make the caramel. In a small saucepan over medium heat, melt 1 cup of sugar without stirring (just swirl the pan). Cook until it turns a deep amber color (about 5–7 minutes). Immediately divide the caramel into the 8 ramekins, swirling each to coat the bottom evenly. Set aside — the caramel will harden as it cools.",
      "Make the custard. In a large mixing bowl, whisk the eggs gently — do not over-whisk or you'll create bubbles that ruin the silky texture. Add the condensed milk, evaporated milk, vanilla, and pinch of salt. Whisk until smooth.",
      "Strain the mixture. Pour through a fine-mesh strainer twice. This removes any unbroken egg solids and is the secret to silky-smooth flan.",
      "Fill ramekins. Pour the strained custard over the hardened caramel in each ramekin. Fill to about 4.5 oz (just below the rim — leave ~½ inch of headroom).",
      "Cover each ramekin tightly with foil. This keeps excess moisture out during steaming.",
      "Steam. Place ramekins in a steamer basket or large pot with about 1 inch of water in the bottom. Steam over low–medium heat for 45–60 minutes. The flan is done when the center jiggles slightly but isn't liquid — do not overcook or it gets rubbery.",
      "Cool, then chill. Let cool to room temperature, then refrigerate at least 4 hours (overnight is best). The flan needs to chill fully so the caramel reliquefies on the bottom.",
      "Lid & label. Cap each ramekin and apply the Mr. K's sticker. Store refrigerated until pickup.",
    ],
    scaling: [
      {
        multiplier: 1,
        ingredientAmounts: {
          "1× batch": "8 ramekins, listed ingredients",
        },
        yieldUnits: 8,
        totalCost: 10.32,
        revenueAt: 28.0,
        profit: 17.68,
      },
      {
        multiplier: 2,
        ingredientAmounts: {
          "2× batch": "2× all wet ingredients, 16 ramekins, 2 cups sugar for caramel, etc.",
        },
        yieldUnits: 16,
        totalCost: 20.62,
        revenueAt: 56.0,
        profit: 35.38,
      },
      {
        multiplier: 3,
        ingredientAmounts: {
          "3× batch": "3× wet ingredients, 24 ramekins, scale caramel accordingly",
        },
        yieldUnits: 24,
        totalCost: 30.93,
        revenueAt: 84.0,
        profit: 53.07,
      },
    ],
    notes:
      "Use ~5 ramekins per pound of custard mix — do not overfill or underfill. Each ramekin should be ~4.5 oz so a 5 oz cup looks full. Underfilled flan looks cheap. Always strain twice — the difference between silky and grainy.",
  },
];

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export function allRecipeIds(): string[] {
  return RECIPES.map((r) => r.id);
}

function sumIngredientsCost(ing: Ingredient[]): number {
  return ing.reduce((s, i) => s + (Number.isFinite(i.unitCost) ? i.unitCost : 0), 0);
}

export function sharedIngredientsCostExcludingVariants(r: Recipe): number {
  return sumIngredientsCost(r.ingredients);
}

/** Blended 50-pc batch cost: uses variant `totalCostOverride` when set. */
export function batchCostForLumpiaVariant(
  r: Recipe,
  variant: RecipeVariant
): number {
  if (variant.totalCostOverride != null) {
    return variant.totalCostOverride;
  }
  return (
    sharedIngredientsCostExcludingVariants(r) +
    sumIngredientsCost(
      (variant.ingredientOverrides.filter(Boolean) as Ingredient[]).map(
        (i) => ({
          name: i.name ?? "",
          amount: i.amount ?? "",
          unitCost: i.unitCost ?? 0,
          source: i.source,
        })
      )
    )
  );
}

