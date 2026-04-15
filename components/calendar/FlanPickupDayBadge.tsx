/** Tiny label for calendar cells: flan-only pickup days (visible without clicking). */
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
        "block max-w-full truncate text-center text-[7px] font-bold uppercase leading-tight tracking-tight",
        inverted ? "text-white/95" : "text-amber-900",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title="Flan pickup only — full menu Fri & Sat"
    >
      Flan only
    </span>
  );
}
