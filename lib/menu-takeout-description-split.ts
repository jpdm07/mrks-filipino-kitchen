/**
 * Known takeout / packaging clauses at the end of menu descriptions (MENU_CATALOG + DB).
 * Longest first so e.g. lumpia’s “…per order of dozen.” is not cut by the shorter quail phrase.
 * Any match is shown as {@link MENU_DIP_DISPLAY_LINE} (no per-dozen / count wording).
 */
const LEGACY_DIP_SUFFIXES = [
  "🥡 Comes with 2 dipping sauces per order of dozen.",
  "🥡 Comes with 2 dipping sauces.",
  "🥡 Includes dipping sauce on the side.",
] as const;

/** Single line under menu body copy for items that include dip (no quantity). */
export const MENU_DIP_DISPLAY_LINE = "🥡 Comes with a dipping sauce.";

export function splitMenuTakeoutLine(description: string): {
  lead: string;
  dipNote: string | null;
} {
  const unifiedIdx = description.indexOf(MENU_DIP_DISPLAY_LINE);
  if (unifiedIdx >= 0) {
    return {
      lead: description.slice(0, unifiedIdx).trimEnd(),
      dipNote: MENU_DIP_DISPLAY_LINE,
    };
  }
  for (const needle of LEGACY_DIP_SUFFIXES) {
    const i = description.indexOf(needle);
    if (i >= 0) {
      return {
        lead: description.slice(0, i).trimEnd(),
        dipNote: MENU_DIP_DISPLAY_LINE,
      };
    }
  }
  return { lead: description, dipNote: null };
}
