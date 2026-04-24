/** Tiny label for calendar cells: dessert-only pickup days (e.g. Tue–Thu) — visible without clicking. */
export function FlanPickupDayBadge({
  inverted = false,
  className = "",
}: {
  inverted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={[
        "block max-w-full text-center text-[6.5px] font-bold uppercase leading-tight tracking-tight",
        inverted ? "text-white/95" : "text-amber-900",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title="Dessert pickups only — full menu Fri & Sat"
    >
      <span className="block leading-none">Dessert</span>
      <span className="mt-0.5 block leading-none">pickups only</span>
    </span>
  );
}
