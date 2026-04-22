import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";

const RECIPES = [
  { id: "lumpia", title: "Lumpia (Beef, Pork, or Turkey)", body: `YIELD: 1 dozen | COOK ~45 min\nCONTAINER: 8×8 alum + foil + 2 dips (cooked) or gallon Ziploc + parchment + 2 dips (frozen)\n\nINGREDIENTS / DOZEN: 0.5 lb ground meat; ¼ medium yellow onion; 3 cloves garlic; ¼ cup shredded carrots; 2 tbsp soy sauce; salt & pepper; 12–14 lumpia wrappers (Spring Home/Menlo — HMart Katy); 2–3 c oil to fry.\n\n1. Mix meat, onion, garlic, carrots, soy, salt, pepper.\n2. Wrap ~1 heaping tbsp filling per roll; seal with water.\n3. COOKED: fry 350–375°F 3–4 min. FROZEN: freeze raw on parchment, then bag.` },
  { id: "pancit", title: "Pancit Bihon", body: `SMALL = 1 serving in a single-serving to-go container (not 8×8 alum). PARTY 8–10 · 9×13 tray. Garlic crisps on top; lime on the side.\n\nSMALL: 6oz chicken or shrimp; 4oz dry bihon; 1.5 cups cabbage; ½ cup carrots; ½ small onion; 5 garlic cloves; soy, fish sauce, broth, oil, limes. Scale ~2.5× party.\n\nSoak bihon 15 min. Crisp-slice garlic for topping. Sauté aromatics, protein, veg, liquids, toss noodles, top crisps.` },
  {
    id: "flan",
    title: "Caramel Flan",
    body: `1 BATCH: 1 can sweetened condensed milk · 1 can evaporated milk · 1 tsp vanilla extract · 3 eggs · 1 cup sugar (caramel syrup) · 1 pinch salt.\n\nCONTAINER: Findful 5oz silver ramekins + clear lids — bake/serve in same ramekin.\n\nMake caramel from the sugar; strain custard twice; divide into ramekins; steam or water bath until set; cool fully — lid only when cold.`,
  },
  {
    id: "yema",
    title: "Yema (milk candy)",
    body: `Milk candy — cook sweetened condensed milk with egg yolks and a little butter until thick; cool slightly; portion and roll or shape as you like (optional coat in sugar).\n\nRETAIL: $0.50 per piece or $6 per dozen (12 pcs).\n\nPack in small cups or parchment; no dip cup.`,
  },
  { id: "tocino-mar", title: "Tocino marinade", body: `Batch from 1 lb pork shoulder/belly OR chicken thighs (¼\" slices); ¼ c brown sugar; 3 tbsp soy; 2 tbsp white vinegar; 1 tsp annatto; 4 garlic cloves; ½ tsp salt. Marinate overnight. Plates: pan-fry complete plate with egg, rice, veg, dip. RETAIL FROZEN PACK: portion 12 oz (340g) marinated meat per bag — seal + parchment, gallon or quart freezer bag per your workflow.` },
  { id: "tocino-plate", title: "Tocino plate assembly", body: `5–6 slices + sunny egg + 1 c jasmine rice + 3 cucumber + 3 tomato + garlic crisps + 1 dip cup in 3-comp foam.` },
  {
    id: "adobo",
    title: "Chicken or Pork adobo (balanced, glossy sauce)",
    body: `Protein: bone-in chicken (drumstick+thigh) OR pork shoulder or butt, cubed (not belly). Soy–vinegar–garlic–bay–peppercorns; reduce sauce until thick and glossy.\n\nSEAR, BRAISE, REDUCE: ⅓ c soy; ¼ c vinegar; water to barely cover; garlic; bay; peppercorns; oil. Cover until fork-tender (chicken ~45 min, pork 60–75 min), then uncover and reduce 8–12 min.\n\nPLATE: jasmine rice, fried egg, meat + sauce (same container format as other plates). PARTY TRAY (8–10, menu $55): scale meat ~3.5 lb raw, 4 c uncooked rice, foil tray + lid; no drumstick-only wording — pork plates use shoulder cubes.`,
  },
  { id: "dip", title: "Dipping sauce (20×2oz)", body: `⅓ red onion minced; ⅓ cucumber minced; 3 garlic; 3 tsp soy; ½ c brown sugar; 1 c vinegar; fish sauce & peppercorns to taste. Dissolve sugar, combine, fill cups ¾, refrigerate ≤5 days.` },
  { id: "quail", title: "Quail eggs (10)", body: `Buy quail eggs at HMart Katy AsiaTown. Bread & fry; pack 8×8 + foil + 2 dip cups.` },
];

export default async function KitchenGuidePage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <p className="text-sm text-[color:var(--primary)]">Last updated: April 2026</p>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[color:var(--primary)]">
        Kitchen & shopping guide
      </h1>
      <p className="text-base text-[var(--text-muted)]">
        Owner reference only — static copy. For a budgeted, printable list with
        checkboxes, open{" "}
        <Link
          href="/admin/grocery-list"
          className="font-semibold text-[var(--primary)] underline"
        >
          Grocery trip planner
        </Link>
        .
      </p>
      <div className="rounded-lg border-2 border-[#FFC200] bg-[var(--gold-light)] p-4 text-sm">
        <strong className="text-[color:var(--primary)]">Print shopping list</strong>
        <p className="mt-1">
          Open your browser print dialog (Ctrl+P) while viewing this section to save as PDF.
        </p>
      </div>
      <section className="print:block">
        <h2 className="text-xl font-bold text-[color:var(--primary)]">Master shopping list (by store)</h2>
        <div className="mt-3 space-y-4 whitespace-pre-line text-sm leading-relaxed text-[var(--text)]">
          <p>
            <strong>KROGER — 9703 Barker Cypress Rd, Cypress TX 77433</strong>
            {"\n"}
            Ground beef/pork/turkey, drumsticks (Heritage Farm), shrimp frozen, milks, eggs, rice, bihon,
            soy, fish sauce, broth, oil, vinegar, sugars, spices, produce, limes, napkins, etc.
          </p>
          <p>
            <strong>HEB</strong> — Excellent Pancit Bihon noodles, annatto, produce deals.
          </p>
          <p>
            <strong>HMART KATY</strong> — 23119 Colonial Pkwy: lumpia wrappers, quail eggs.
          </p>
          <p>
            <strong>AMAZON</strong> — Findful ramekins, 2oz cups, foil, pans, Ziploc, parchment, foam
            3-comp, bags.
          </p>
        </div>
      </section>
      <h2 className="text-xl font-bold text-[color:var(--primary)]">Recipes</h2>
      <div className="space-y-2">
        {RECIPES.map((r) => (
          <details
            key={r.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm open:shadow-md"
          >
            <summary className="cursor-pointer text-base font-bold text-[color:var(--primary)]">
              {r.title}
            </summary>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-[var(--text)]">{r.body}</pre>
          </details>
        ))}
      </div>
    </div>
  );
}
