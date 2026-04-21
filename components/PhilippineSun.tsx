type PhilippineSunProps = {
  size?: number;
  color?: string;
  className?: string;
  /** When true, hide from assistive tech (cursor accents, purely decorative). */
  decorative?: boolean;
};

export function PhilippineSun({
  size = 48,
  color = "#D4A944",
  className,
  decorative,
}: PhilippineSunProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-110 -110 220 220"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={decorative ? undefined : "Philippine sun"}
      aria-hidden={decorative ? true : undefined}
    >
      <g fill={color}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            {/* Main ray */}
            <polygon points="-3.5,-28 3.5,-28 1.5,-60 0,-92 -1.5,-60" />
            {/* Left secondary ray */}
            <g transform="rotate(-17)">
              <polygon points="-2,-28 2,-28 1,-50 0,-72 -1,-50" />
            </g>
            {/* Right secondary ray */}
            <g transform="rotate(17)">
              <polygon points="-2,-28 2,-28 1,-50 0,-72 -1,-50" />
            </g>
          </g>
        ))}
      </g>
      <circle cx="0" cy="0" r="26" fill={color} />
    </svg>
  );
}
