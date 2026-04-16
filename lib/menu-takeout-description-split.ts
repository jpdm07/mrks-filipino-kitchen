/**
 * Known takeout / packaging clauses at the end of menu descriptions (MENU_CATALOG).
 * Longest first so e.g. lumpia’s “…per order of dozen.” is not cut by the shorter quail phrase.
 */
const MENU_TAKEOUT_LINE_SUFFIXES = [
  "🥡 Comes with 2 dipping sauces per order of dozen.",
  "🥡 Comes with 2 dipping sauces.",
  "🥡 Includes dipping sauce on the side.",
] as const;

export function splitMenuTakeoutLine(description: string): {
  lead: string;
  dipNote: string | null;
} {
  for (const needle of MENU_TAKEOUT_LINE_SUFFIXES) {
    const i = description.indexOf(needle);
    if (i >= 0) {
      return {
        lead: description.slice(0, i).trimEnd(),
        dipNote: needle,
      };
    }
  }
  return { lead: description, dipNote: null };
}
