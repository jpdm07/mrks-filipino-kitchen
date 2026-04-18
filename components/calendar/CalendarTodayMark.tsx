"use client";

/** Red “Today” label for calendar day cells (pickup TZ date match). */
export function CalendarTodayMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={[
        "block text-center text-[8px] font-extrabold uppercase leading-tight tracking-wide text-red-600",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      Today
    </span>
  );
}
