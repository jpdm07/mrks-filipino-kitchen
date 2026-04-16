import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";

const RECIPES = [
  { id: "lumpia", title: "Lumpia (Beef, Pork, or Turkey)", body: `YIELD: 1 dozen | COOK ~45 min\nCONTAINER: 8×8 alum + foil + 2 dips (cooked) or gallon Ziploc + parchment + 2 dips (frozen)\n\nINGREDIENTS / DOZEN: 0.5 lb ground meat; ¼ medium yellow onion; 3 cloves garlic; ¼ cup shredded carrots; 2 tbsp soy sauce; salt & pepper; 12–14 lumpia wrappers (Spring Home/Menlo — HMart Katy); 2–3 c oil to fry.\n\n1. Mix meat, onion, garlic, carrots, soy, salt, pepper.\n2. Wrap ~1 heaping tbsp filling per roll; seal with water.\n3. COOKED: fry 350–375°F 3–4 min. FROZEN: freeze raw on parchment, then bag.` },
  { id: "pancit", title: "Pancit Bihon", body: `SMALL = 1 serving in a single-serving to-go container (not 8×8 alum). PARTY 8–10 · 9×13 tray. Garlic crisps on top; lime on the side.\n\nSMALL: 6oz chicken or shrimp; 4oz dry bihon; 1.5 cups cabbage; ½ cup carrots; ½ small onion; 5 garlic cloves; soy, fish sauce, broth, oil, limes. Scale ~2.5× party.\n\nSoak bihon 15 min. Crisp-slice garlic for topping. Sauté aromatics, protein, veg, liquids, toss noodles, top crisps.` },
  { id: "flan", title: "Caramel Flan", body: `8 Findful 5oz silver ramekins + clear lids. Bake/serve in same ramekin.\n\n2×14oz condensed; 1×12oz evaporated; 8 yolks; ½ cup sugar caramel; 1 tsp vanilla.\n\nCaramel per ramekin, strain custard twice, steam or water bath until set, cool fully, lid on only when cold.` },
  { id: "tocino-mar", title: "Tocino marinade", body: `Batch from 1 lb pork shoulder/belly OR chicken thighs (¼\" slices); ¼ c brown sugar; 3 tbsp soy; 2 tbsp white vinegar; 1 tsp annatto; 4 garlic cloves; ½ tsp salt. Marinate overnight. Plates: pan-fry complete plate with egg, rice, veg, dip. RETAIL FROZEN PACK: portion 12 oz (340g) marinated meat per bag — seal + parchment, gallon or quart freezer bag per your workflow.` },
  { id: "tocino-plate", title: "Tocino plate assembly", body: `5–6 slices + sunny egg + 1 c jasmine rice + 3 cucumber + 3 tomato + garlic crisps + 1 dip cup in 3-comp foam.` },
  { id: "adobo", title: "Chicken adobo (balanced sauce)", body: `2.2 lb drumsticks/thighs mix as needed; ⅓ c soy; ¼ c vinegar; ¾ c water; 1 head garlic; 2 bay; 1 tsp peppercorns; 1–2 tsp sugar; 1–2 tbsp oil. Sear, add liquids, boil, simmer covered 15–20 min, uncover and reduce until glossy. Rest 10–15 min.\n\nPLATE (menu — 1 serving): 1 drumstick + 1 thigh; 1 fried egg; 1 c jasmine rice; adobo sauce; 1 dip; 3-comp foam. PARTY: 9×13 tray, 8–10 srv; include small dips for the group.` },
  { id: "dip", title: "Dipping sauce (20×2oz)", body: `⅓ red onion minced; ⅓ cucumber minced; 3 garlic; 3 tsp soy; ½ c brown sugar; 1 c vinegar; fish sauce & peppercorns to taste. Dissolve sugar, combine, fill cups ¾, refrigerate ≤5 days.` },
  { id: "quail", title: "Quail eggs (10)", body: `Buy quail eggs at HMart Katy AsiaTown. Bread & fry; pack 8×8 + foil + 2 dip cups.` },
];

export default async function KitchenGuidePage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <p className="text-sm text-[#0038A8]">Last updated: April 2026</p>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0038A8]">
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
        <strong className="text-[#0038A8]">Print shopping list</strong>
        <p className="mt-1">
          Open your browser print dialog (Ctrl+P) while viewing this section to save as PDF.
        </p>
      </div>
      <section className="print:block">
        <h2 className="text-xl font-bold text-[#0038A8]">Master shopping list (by store)</h2>
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
      <h2 className="text-xl font-bold text-[#0038A8]">Recipes</h2>
      <div className="space-y-2">
        {RECIPES.map((r) => (
          <details
            key={r.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm open:shadow-md"
          >
            <summary className="cursor-pointer text-base font-bold text-[#0038A8]">
              {r.title}
            </summary>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-[var(--text)]">{r.body}</pre>
          </details>
        ))}
      </div>
    </div>
  );
}
