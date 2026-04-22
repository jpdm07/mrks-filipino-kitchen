/**
 * Single source of truth for menu photos & retail prices.
 * New orders push line prices to Sheets (Items column). Admin menu saves also refresh the
 * **Menu prices** sheet via the same webhook — see `SHEETS_SCRIPT.md` + `syncMenuPricesToSheets`.
 * Lumpia retail is derived from `lumpia-cost-model.ts` (50-ct batch COGS + labor + oil).
 * Lumpia 4-pc sample prices: `LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN` (⅓ dozen per protein).
 * Tocino list prices from `tocino-cost-model.ts` (COGS for Sheets via `menu-item-unit-costs`).
 * Adobo list prices from `adobo-cost-model.ts`.
 * Flan retail is `FLAN_RETAIL_PER_RAMEKIN_USD` in `flan-cost-model.ts` (individual ramekin only).
 * Yema retail is `YEMA_RETAIL_*` in `yema-cost-model.ts`.
 * Edit here first, then run: npx prisma db seed (or update rows in Admin → Menu Manager / DB).
 */

import { ADOBO_RETAIL_USD } from "./adobo-cost-model";
import { FLAN_RETAIL_PER_RAMEKIN_USD } from "./flan-cost-model";
import {
  YEMA_RETAIL_SINGLE_USD,
  YEMA_RETAIL_TWELVE_PACK_USD,
} from "./yema-cost-model";
import {
  lumpiaCatalogSizesForProtein,
  LUMPIA_RETAIL_TIERS_USD,
} from "./lumpia-cost-model";
import { TOCINO_RETAIL_USD } from "./tocino-cost-model";
import {
  PANCIT_LIME_COST_USD,
  PANCIT_LIMES_PARTY_TRAY,
} from "./pancit-limes";
import { HERO_FULLBLEED_IMAGE_SRC, OPEN_GRAPH_IMAGE_SRC } from "./site-visuals";

export {
  PANCIT_LIME_COST_USD,
  PANCIT_LIMES_PARTY_TRAY,
  PANCIT_LIMES_SMALL_TRAY,
} from "./pancit-limes";

/**
 * Your lumpia photos — add a JPEG at `public/images/lumpia.jpg` (hero, menu cards, social preview).
 * For .png or .webp, change the path here and the filename on disk.
 */
export const LUMPIA_IMAGE = "/images/lumpia.jpg";

/** Pancit — add `public/images/pancit.jpg`. */
export const PANCIT_IMAGE = "/images/pancit.jpg";

/** Breaded quail eggs — add `public/images/quail-eggs.jpg`. */
export const QUAIL_EGGS_IMAGE = "/images/quail-eggs.jpg";

/** Tocino plates — add `public/images/tocino.jpg`. */
export const TOCINO_IMAGE = "/images/tocino.jpg";

/** Caramel flan — add `public/images/flan.jpg`. */
export const FLAN_IMAGE = "/images/flan.jpg";

/** Yema candy — `public/images/yema.jpg`. */
export const YEMA_IMAGE = "/images/yema.jpg";

/** Chicken adobo — `public/images/chickenadobo.jpeg`. */
export const ADOBO_IMAGE = "/images/chickenadobo.jpeg";

/**
 * Home hero + social preview image. Default is `/images/sinigang.jpg`; override with
 * `NEXT_PUBLIC_HERO_FULLBLEED_IMAGE` in `.env.local` if needed.
 */
export const CATALOG_HERO_IMAGE = HERO_FULLBLEED_IMAGE_SRC;

/**
 * Open Graph / Twitter card (resolved with `metadataBase` in `app/layout.tsx`).
 * Override with `NEXT_PUBLIC_OG_IMAGE`; otherwise matches hero.
 */
export const CATALOG_OG_IMAGE = OPEN_GRAPH_IMAGE_SRC;

/**
 * Alternate hero (Unsplash). To use: point env or `HERO_FULLBLEED_IMAGE_SRC` in `site-visuals.ts`.
 */
export const CATALOG_HERO_IMAGE_PARADE =
  "https://images.unsplash.com/photo-1609051461156-8257e7852410?w=1600&auto=format&fit=crop";

export const CATALOG_OG_IMAGE_PARADE =
  "https://images.unsplash.com/photo-1609051461156-8257e7852410?w=1200&auto=format&fit=crop";

/**
 * Menu card photos — files under `public/images/` (see constants above).
 */
/** Shared public copy for all lumpia protein rows (prices differ by size + protein). */
const LUMPIA_ITEM_DESCRIPTION =
  "Our hand-rolled lumpia are made fresh to order using full-size wrappers — bigger than the bite-size cocktail versions you'll find at cafes. Each roll is stuffed with seasoned meat and vegetables, then fried until golden and shatter-crisp (or frozen uncooked, so you can fry them fresh at home). Comes with our house dipping sauce. Pork · Turkey · Beef. Cooked or frozen — same price per tier.";

export const CATALOG_PHOTOS = {
  lumpia: LUMPIA_IMAGE,
  pancit: PANCIT_IMAGE,
  flan: FLAN_IMAGE,
  yema: YEMA_IMAGE,
  quail: QUAIL_EGGS_IMAGE,
  tocino: TOCINO_IMAGE,
  adobo: ADOBO_IMAGE,
} as const;

/**
 * Retail pricing (review periodically).
 */
export const MENU_CATALOG = [
  {
    id: "seed-1",
    name: "Lumpia — Beef",
    description: LUMPIA_ITEM_DESCRIPTION,
    category: "Sides",
    calories: "Varies by size (est. on order)",
    basePrice: LUMPIA_RETAIL_TIERS_USD.beef.dz1,
    sizes: [...lumpiaCatalogSizesForProtein("beef")].map((s) => ({ ...s })),
    photoUrl: CATALOG_PHOTOS.lumpia,
    hasCooked: true,
    hasFrozen: true,
    sortOrder: 3,
    variantGroup: "lumpia",
    variantShortLabel: "Beef",
    groupCardTitle: "Lumpia",
  },
  {
    id: "seed-2",
    name: "Lumpia — Pork",
    description: LUMPIA_ITEM_DESCRIPTION,
    category: "Sides",
    calories: "Varies by size (est. on order)",
    basePrice: LUMPIA_RETAIL_TIERS_USD.pork.dz1,
    sizes: [...lumpiaCatalogSizesForProtein("pork")].map((s) => ({ ...s })),
    photoUrl: CATALOG_PHOTOS.lumpia,
    hasCooked: true,
    hasFrozen: true,
    sortOrder: 1,
    variantGroup: "lumpia",
    variantShortLabel: "Pork",
    groupCardTitle: "Lumpia",
  },
  {
    id: "seed-3",
    name: "Lumpia — Turkey",
    description: LUMPIA_ITEM_DESCRIPTION,
    category: "Sides",
    calories: "Varies by size (est. on order)",
    basePrice: LUMPIA_RETAIL_TIERS_USD.turkey.dz1,
    sizes: [...lumpiaCatalogSizesForProtein("turkey")].map((s) => ({ ...s })),
    photoUrl: CATALOG_PHOTOS.lumpia,
    hasCooked: true,
    hasFrozen: true,
    sortOrder: 2,
    variantGroup: "lumpia",
    variantShortLabel: "Turkey",
    groupCardTitle: "Lumpia",
  },
  {
    id: "seed-4",
    name: "Pancit: Chicken",
    description:
      "The Filipino birthday classic. Rice vermicelli noodles stir-fried with your choice of tender chicken or plump shrimp, cabbage, carrots, and our savory soy–fish sauce base. Traditionally served at birthdays to symbolize long life. Finished with garlic crisps and a wedge of lime on the side. Chicken · Shrimp. Single serving (to-go container) · 2–4 servings · Party tray 8–10 servings (9×13).",
    category: "Meals",
    calories: "~320 cal/serving",
    basePrice: 10.99,
    sizes: [
      {
        key: "small",
        label: "Chicken — 1 serving (to-go container)",
        price: 10.99,
      },
      {
        key: "twoFour",
        label: "Chicken — 2–4 servings",
        price: 25,
      },
      {
        key: "party",
        label: "Chicken Party (8-10 srv) — 9×13 tray",
        price: 63.5 + PANCIT_LIME_COST_USD * PANCIT_LIMES_PARTY_TRAY,
      },
    ],
    photoUrl: CATALOG_PHOTOS.pancit,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 4,
    variantGroup: "pancit",
    variantShortLabel: "Chicken",
    groupCardTitle: "Pancit",
  },
  {
    id: "seed-5",
    name: "Pancit: Shrimp",
    description:
      "The Filipino birthday classic. Rice vermicelli noodles stir-fried with your choice of tender chicken or plump shrimp, cabbage, carrots, and our savory soy–fish sauce base. Traditionally served at birthdays to symbolize long life. Finished with garlic crisps and a wedge of lime on the side. Chicken · Shrimp. Single serving (to-go container) · 2–4 servings · Party tray 8–10 servings (9×13).",
    category: "Meals",
    calories: "~290 cal/serving",
    basePrice: 12.99,
    sizes: [
      {
        key: "small",
        label: "Shrimp — 1 serving (to-go container)",
        price: 12.99,
      },
      {
        key: "twoFour",
        label: "Shrimp — 2–4 servings",
        price: 28,
      },
      {
        key: "party",
        label: "Shrimp Party (8-10 srv) — 9×13 tray",
        price: 78.5 + PANCIT_LIME_COST_USD * PANCIT_LIMES_PARTY_TRAY,
      },
    ],
    photoUrl: CATALOG_PHOTOS.pancit,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 5,
    variantGroup: "pancit",
    variantShortLabel: "Shrimp",
    groupCardTitle: "Pancit",
  },
  {
    id: "seed-6",
    name: "Caramel Flan (Leche Flan)",
    description:
      "Slow-steamed silky egg custard with caramel glaze. Our leche flan is steamed low and slow until it sets into a silky, spoon-coating custard, crowned with a deep amber caramel. Served in a 5 oz ramekin — peel the lid and dig in. 1 ramekin (5 oz) per order.",
    category: "Desserts",
    calories: "~280 cal",
    basePrice: FLAN_RETAIL_PER_RAMEKIN_USD,
    sizes: [
      {
        key: "individual",
        label: "Individual (1 ramekin)",
        price: FLAN_RETAIL_PER_RAMEKIN_USD,
      },
    ],
    photoUrl: CATALOG_PHOTOS.flan,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 6,
  },
  {
    id: "seed-13",
    name: "Yema",
    description:
      "Buttery, slow-cooked Filipino milk candy. Sweet, rich, and creamy — the classic merienda treat. Great as an add-on or a small gift.",
    category: "Desserts",
    calories: "~85 cal per piece (estimate)",
    basePrice: YEMA_RETAIL_SINGLE_USD,
    sizes: [
      {
        key: "single",
        label: "Per piece",
        price: YEMA_RETAIL_SINGLE_USD,
      },
      {
        key: "twelve",
        label: "Per dozen (12 pcs)",
        price: YEMA_RETAIL_TWELVE_PACK_USD,
      },
    ],
    photoUrl: CATALOG_PHOTOS.yema,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 7,
  },
  {
    id: "seed-7",
    name: "Quail Eggs (10 pcs)",
    description:
      "Kwek-kwek — Filipino street-food favorite. Fresh quail eggs hand-battered in seasoned flour and deep-fried crispy — our take on kwek-kwek, the iconic Filipino street snack. Served with dipping sauce. Perfect as an appetizer or add-on. 10 pieces per order.",
    category: "Sides",
    calories: "~165 cal / 10 pcs (breaded)",
    basePrice: 7.99,
    sizes: [{ key: "10pc", label: "Per 10 pcs", price: 7.99 }],
    photoUrl: CATALOG_PHOTOS.quail,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 8,
  },
  {
    id: "seed-8",
    name: "Tocino — Pork with Egg and Rice",
    description:
      "Sweet-cured, caramelized pork or chicken. Our tocino is marinated overnight in a classic Filipino cure — brown sugar, soy sauce, white vinegar, annatto, garlic — then pan-fried to a glossy caramelized glaze. The plate comes complete: fluffy jasmine rice, a sunny-side-up egg, fresh cucumber and tomato slices, and a scatter of crispy garlic crisps. Pork · Chicken.",
    category: "Meals",
    calories: "~540",
    basePrice: TOCINO_RETAIL_USD.cookedPlate,
    sizes: [
      {
        key: "plate",
        label: "Ready-Made Plate",
        price: TOCINO_RETAIL_USD.cookedPlate,
      },
    ],
    photoUrl: CATALOG_PHOTOS.tocino,
    hasCooked: true,
    hasFrozen: false,
    sortOrder: 9,
    variantGroup: "tocino",
    variantShortLabel: "Pork",
    groupCardTitle: "Tocino",
  },
  {
    id: "seed-9",
    name: "Tocino — Chicken with Egg and Rice",
    description:
      "Sweet-cured, caramelized pork or chicken. Our tocino is marinated overnight in a classic Filipino cure — brown sugar, soy sauce, white vinegar, annatto, garlic — then pan-fried to a glossy caramelized glaze. The plate comes complete: fluffy jasmine rice, a sunny-side-up egg, fresh cucumber and tomato slices, and a scatter of crispy garlic crisps. Pork · Chicken.",
    category: "Meals",
    calories: "~510",
    basePrice: TOCINO_RETAIL_USD.cookedPlate,
    sizes: [
      {
        key: "plate",
        label: "Ready-Made Plate",
        price: TOCINO_RETAIL_USD.cookedPlate,
      },
    ],
    photoUrl: CATALOG_PHOTOS.tocino,
    hasCooked: true,
    hasFrozen: false,
    sortOrder: 10,
    variantGroup: "tocino",
    variantShortLabel: "Chicken",
    groupCardTitle: "Tocino",
  },
  {
    id: "seed-10",
    name: "Frozen Tocino — Pork (Cook at Home)",
    description:
      "Sweet-cured, caramelized pork or chicken. Marinated overnight in a classic Filipino cure — brown sugar, soy sauce, white vinegar, annatto, garlic — then portioned and frozen. Thaw and pan-fry to a glossy caramelized glaze. 12 oz (340 g) raw marinated meat (thin slices) in a sealed bag — cook at home. Pork · Chicken.",
    category: "Meals",
    calories: "Calories vary when cooked",
    basePrice: TOCINO_RETAIL_USD.frozen12oz,
    sizes: [
      {
        key: "frozen",
        label: "12 oz / 340g marinated · sealed freezer bag",
        price: TOCINO_RETAIL_USD.frozen12oz,
      },
    ],
    photoUrl: CATALOG_PHOTOS.tocino,
    hasCooked: false,
    hasFrozen: true,
    sortOrder: 11,
    variantGroup: "tocino",
    variantShortLabel: "Pork",
    groupCardTitle: "Tocino",
  },
  {
    id: "seed-11",
    name: "Frozen Tocino — Chicken (Cook at Home)",
    description:
      "Sweet-cured, caramelized pork or chicken. Marinated overnight in a classic Filipino cure — brown sugar, soy sauce, white vinegar, annatto, garlic — then portioned and frozen. Thaw and pan-fry to a glossy caramelized glaze. 12 oz (340 g) raw marinated meat (thin slices) in a sealed bag — cook at home. Pork · Chicken.",
    category: "Meals",
    calories: "Calories vary when cooked",
    basePrice: TOCINO_RETAIL_USD.frozen12oz,
    sizes: [
      {
        key: "frozen",
        label: "12 oz / 340g marinated · sealed freezer bag",
        price: TOCINO_RETAIL_USD.frozen12oz,
      },
    ],
    photoUrl: CATALOG_PHOTOS.tocino,
    hasCooked: false,
    hasFrozen: true,
    sortOrder: 12,
    variantGroup: "tocino",
    variantShortLabel: "Chicken",
    groupCardTitle: "Tocino",
  },
  {
    id: "seed-12",
    name: "Chicken Adobo",
    description:
      "Slow-braised bone-in chicken, the national dish. Bone-in chicken slow-braised in Mr. K's soy-vinegar adobo sauce with garlic, bay leaf, and whole peppercorns. We reduce the sauce until it's thick and glossy, so every piece gets that signature savory-tangy coat. Plate comes with jasmine rice, a fried egg, one drumstick and one thigh. Party tray feeds 8–10. Plate (1 drumstick + 1 thigh, rice, egg) · Party Tray (8–10 servings).",
    category: "Meals",
    calories: "~520 (plate)",
    basePrice: ADOBO_RETAIL_USD.plate,
    sizes: [
      {
        key: "plate",
        label: "Plate — 1 serving (rice, egg, 1 drumstick & 1 thigh)",
        price: ADOBO_RETAIL_USD.plate,
      },
      {
        key: "party",
        label: "Party Tray (8-10 servings)",
        price: ADOBO_RETAIL_USD.party,
      },
    ],
    photoUrl: CATALOG_PHOTOS.adobo,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 13,
  },
] as const;

export type CatalogMenuItem = (typeof MENU_CATALOG)[number];
