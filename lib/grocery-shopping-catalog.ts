/**
 * Default grocery lines for admin shopping planner — rough “anticipated” budgets
 * aligned with comments in `lumpia-cost-model.ts` + kitchen guide store splits.
 * Edit budgets on the planner page; values persist in localStorage per browser.
 */

export type GroceryStoreHint =
  | "Kroger"
  | "HEB"
  | "HMart"
  | "Amazon"
  | "Any";

export type GroceryCatalogLine = {
  id: string;
  label: string;
  store: GroceryStoreHint;
  /** Typical purchase unit (for your notes, not math). */
  unit: string;
  /** Starting anticipated spend for this line (USD). */
  anticipatedUsd: number;
};

export const GROCERY_CATALOG: GroceryCatalogLine[] = [
  {
    id: "ground-beef",
    label: "Ground beef (lumpia)",
    store: "Kroger",
    unit: "1 lb",
    anticipatedUsd: 6.25,
  },
  {
    id: "ground-pork",
    label: "Ground pork (lumpia)",
    store: "Kroger",
    unit: "1 lb",
    anticipatedUsd: 3.99,
  },
  {
    id: "ground-turkey",
    label: "Ground turkey (lumpia)",
    store: "Kroger",
    unit: "1 lb",
    anticipatedUsd: 4.99,
  },
  {
    id: "carrots-bag",
    label: "Carrots (shredded / bag)",
    store: "Kroger",
    unit: "1 bag",
    anticipatedUsd: 2.59,
  },
  {
    id: "celery",
    label: "Celery (bunch)",
    store: "Kroger",
    unit: "1 bunch",
    anticipatedUsd: 1.99,
  },
  {
    id: "red-onion",
    label: "Red onion",
    store: "Kroger",
    unit: "1 each",
    anticipatedUsd: 1.5,
  },
  {
    id: "garlic",
    label: "Garlic (heads)",
    store: "Kroger",
    unit: "1–2 heads",
    anticipatedUsd: 1.2,
  },
  {
    id: "eggs",
    label: "Eggs",
    store: "Kroger",
    unit: "18 ct",
    anticipatedUsd: 3.5,
  },
  {
    id: "soy-sauce",
    label: "Soy sauce (bottle)",
    store: "Kroger",
    unit: "1 bottle",
    anticipatedUsd: 2.0,
  },
  {
    id: "magic-sarap",
    label: "Magic Sarap (or similar)",
    store: "Kroger",
    unit: "1 shaker",
    anticipatedUsd: 4.39,
  },
  {
    id: "lumpia-wrappers",
    label: "Spring roll / lumpia wrappers (Spring Home, Menlo)",
    store: "HMart",
    unit: "1 pack",
    anticipatedUsd: 3.5,
  },
  {
    id: "fry-oil",
    label: "Vegetable oil (frying)",
    store: "Kroger",
    unit: "1 bottle",
    anticipatedUsd: 4.5,
  },
  {
    id: "bihon",
    label: "Pancit bihon noodles",
    store: "HEB",
    unit: "1 pkg",
    anticipatedUsd: 2.5,
  },
  {
    id: "cabbage",
    label: "Cabbage",
    store: "Kroger",
    unit: "1 head",
    anticipatedUsd: 2.0,
  },
  {
    id: "chicken-shrimp",
    label: "Chicken breast / shrimp (pancit)",
    store: "Kroger",
    unit: "as needed",
    anticipatedUsd: 12.0,
  },
  {
    id: "fish-sauce",
    label: "Fish sauce",
    store: "Kroger",
    unit: "1 bottle",
    anticipatedUsd: 3.5,
  },
  {
    id: "broth",
    label: "Chicken broth",
    store: "Kroger",
    unit: "1 carton",
    anticipatedUsd: 2.5,
  },
  {
    id: "limes",
    label: "Limes",
    store: "Kroger",
    unit: "bag",
    anticipatedUsd: 3.0,
  },
  {
    id: "jasmine-rice",
    label: "Jasmine rice",
    store: "Kroger",
    unit: "1 bag",
    anticipatedUsd: 12.0,
  },
  {
    id: "condensed-milk",
    label: "Sweetened condensed milk (flan)",
    store: "Kroger",
    unit: "2×14 oz",
    anticipatedUsd: 5.0,
  },
  {
    id: "evaporated-milk",
    label: "Evaporated milk (flan)",
    store: "Kroger",
    unit: "12 oz",
    anticipatedUsd: 1.5,
  },
  {
    id: "drumsticks-thighs",
    label: "Chicken drumsticks / thighs (adobo)",
    store: "Kroger",
    unit: "per lb",
    anticipatedUsd: 8.0,
  },
  {
    id: "bay-pepper",
    label: "Bay leaves / peppercorns",
    store: "Kroger",
    unit: "jar",
    anticipatedUsd: 4.0,
  },
  {
    id: "pork-shoulder-tocino",
    label: "Pork shoulder or belly (tocino batch)",
    store: "Kroger",
    unit: "2–3 lb",
    anticipatedUsd: 12.0,
  },
  {
    id: "annatto",
    label: "Annatto powder",
    store: "HEB",
    unit: "1 jar",
    anticipatedUsd: 3.0,
  },
  {
    id: "brown-sugar-vinegar",
    label: "Brown sugar + white vinegar (pantry)",
    store: "Kroger",
    unit: "combo",
    anticipatedUsd: 5.0,
  },
  {
    id: "quail-eggs",
    label: "Quail eggs",
    store: "HMart",
    unit: "1 tray",
    anticipatedUsd: 4.5,
  },
  {
    id: "cucumber-tomato",
    label: "Cucumber + tomato (plates)",
    store: "Kroger",
    unit: "produce run",
    anticipatedUsd: 6.0,
  },
  {
    id: "napkins",
    label: "Napkins / disposables",
    store: "Kroger",
    unit: "1 pack",
    anticipatedUsd: 8.0,
  },
];
