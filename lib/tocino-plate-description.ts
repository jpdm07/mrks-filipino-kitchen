/** Tocino *plate* descriptions in MENU_CATALOG end with this clause. */
export const TOCINO_PLATE_DIP_NOTE =
  "🥡 Includes dipping sauce on the side." as const;

export function splitTocinoPlateDipDescription(description: string): {
  lead: string;
  dipNote: string | null;
} {
  const i = description.indexOf(TOCINO_PLATE_DIP_NOTE);
  if (i < 0) return { lead: description, dipNote: null };
  return {
    lead: description.slice(0, i).trimEnd(),
    dipNote: TOCINO_PLATE_DIP_NOTE,
  };
}
