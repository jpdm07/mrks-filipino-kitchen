import { PhilippineSun } from "@/components/PhilippineSun";

export type LogoSize = "sm" | "md" | "lg" | "xl";
export type LogoVariant = "horizontal" | "stacked";
export type LogoTheme = "light" | "dark";

type SizePreset = {
  sun: number;
  mrKsClass: string;
  fkClass: string;
  taglineClass: string;
  dividerWidthClass: string;
};

const SIZE_PRESET: Record<LogoSize, SizePreset> = {
  sm: {
    sun: 38,
    mrKsClass: "text-[1.65rem] sm:text-[1.75rem]",
    fkClass: "text-[10px] tracking-[0.22em]",
    taglineClass: "text-[11px]",
    dividerWidthClass: "max-w-[88px]",
  },
  md: {
    sun: 48,
    mrKsClass: "text-[2rem] sm:text-[2.35rem]",
    fkClass: "text-[11px] tracking-[0.24em] sm:text-xs",
    taglineClass: "text-sm",
    dividerWidthClass: "max-w-[112px]",
  },
  lg: {
    sun: 56,
    mrKsClass: "text-[2.5rem] sm:text-[2.85rem]",
    fkClass: "text-xs tracking-[0.26em] sm:text-sm",
    taglineClass: "text-sm sm:text-base",
    dividerWidthClass: "max-w-[128px]",
  },
  xl: {
    sun: 72,
    mrKsClass: "text-[3rem] sm:text-[3.5rem] md:text-[3.75rem]",
    fkClass: "text-sm tracking-[0.28em] sm:text-[15px]",
    taglineClass: "text-base sm:text-lg",
    dividerWidthClass: "max-w-[160px]",
  },
};

function LogoDivider({
  theme,
  widthClass,
}: {
  theme: LogoTheme;
  widthClass: string;
}) {
  const line = "bg-[color:var(--gold-muted)]";
  const spark =
    theme === "dark"
      ? "text-[color:var(--gold)]"
      : "text-[color:var(--gold)]";
  return (
    <div
      className={`flex w-full items-center justify-center gap-1.5 ${widthClass}`}
      aria-hidden
    >
      <span className={`h-px flex-1 rounded-full ${line}`} />
      <span className={`shrink-0 leading-none ${spark}`}>✦</span>
      <span className={`h-px flex-1 rounded-full ${line}`} />
    </div>
  );
}

export function Logo({
  size = "md",
  variant = "horizontal",
  theme = "light",
  showTagline = false,
  /** When true, same as `theme="dark"` (wordmark for dark/navy panels). */
  light = false,
  className = "",
}: {
  size?: LogoSize;
  variant?: LogoVariant;
  theme?: LogoTheme;
  showTagline?: boolean;
  light?: boolean;
  className?: string;
}) {
  const effectiveTheme: LogoTheme = light ? "dark" : theme;
  const P = SIZE_PRESET[size];

  const mrKsColor =
    effectiveTheme === "dark"
      ? "text-[color:var(--gold)]"
      : "text-[color:var(--gold)]";
  const fkColor =
    effectiveTheme === "dark"
      ? "text-[color:var(--cream)]"
      : "text-[color:var(--primary)]";
  const taglineColor =
    effectiveTheme === "dark"
      ? "text-[color:var(--cream-deep)] italic"
      : "text-[color:var(--text-muted)] italic";

  const sunColor =
    effectiveTheme === "dark"
      ? "var(--gold)"
      : "var(--gold)";

  const lockupText = (
    <div
      className={`flex min-w-0 flex-col justify-center gap-1 ${
        variant === "stacked" ? "items-center text-center" : ""
      }`}
    >
      <span
        className={`font-[family-name:var(--font-dancing)] font-bold leading-none ${mrKsColor} ${P.mrKsClass}`}
      >
        Mr. K&apos;s
      </span>
      <LogoDivider theme={effectiveTheme} widthClass={P.dividerWidthClass} />
      <span
        className={`font-[family-name:var(--font-playfair)] font-bold uppercase ${fkColor} ${P.fkClass}`}
      >
        FILIPINO KITCHEN
      </span>
      {showTagline ? (
        <span
          className={`font-[family-name:var(--font-cormorant)] font-medium ${taglineColor} ${P.taglineClass}`}
        >
          Authentic Filipino Food · Cypress, TX
        </span>
      ) : null}
    </div>
  );

  const sunEl = (
    <PhilippineSun
      size={P.sun}
      color={sunColor}
      decorative
      className="shrink-0"
    />
  );

  if (variant === "stacked") {
    return (
      <div
        className={[
          "flex flex-col items-center gap-2 text-center",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {sunEl}
        {lockupText}
      </div>
    );
  }

  return (
    <div className={["flex min-w-0 items-center gap-3", className].filter(Boolean).join(" ")}>
      {sunEl}
      <div className="min-w-0 flex-1">{lockupText}</div>
    </div>
  );
}
