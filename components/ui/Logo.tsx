type LogoSize = "sm" | "md" | "lg" | "xl";

type Layout = {
  w: number;
  h: number;
  sunCx: number;
  sunCy: number;
  sunOuter: number;
  sunInner: number;
  titleY: number;
  titleFs: number;
  lineY: number;
  lineHalfW: number;
  subY: number;
  subFs: number;
};

const layouts: Record<LogoSize, Layout> = {
  sm: {
    w: 132,
    h: 52,
    sunCx: 66,
    sunCy: 12,
    sunOuter: 15,
    sunInner: 6,
    titleY: 28,
    titleFs: 15,
    lineY: 34,
    lineHalfW: 40,
    subY: 46,
    subFs: 6.5,
  },
  md: {
    w: 172,
    h: 64,
    sunCx: 86,
    sunCy: 14,
    sunOuter: 18,
    sunInner: 7,
    titleY: 34,
    titleFs: 19,
    lineY: 41,
    lineHalfW: 52,
    subY: 56,
    subFs: 8,
  },
  lg: {
    w: 228,
    h: 82,
    sunCx: 114,
    sunCy: 18,
    sunOuter: 22,
    sunInner: 9,
    titleY: 44,
    titleFs: 25,
    lineY: 52,
    lineHalfW: 68,
    subY: 72,
    subFs: 10,
  },
  xl: {
    w: 288,
    h: 102,
    sunCx: 144,
    sunCy: 22,
    sunOuter: 28,
    sunInner: 11,
    titleY: 56,
    titleFs: 32,
    lineY: 66,
    lineHalfW: 86,
    subY: 90,
    subFs: 12,
  },
};

export function Logo({
  size = "md",
  light = false,
}: {
  size?: LogoSize;
  light?: boolean;
}) {
  const L = layouts[size];
  const cx = L.sunCx;
  const cy = L.sunCy;
  const rays = 8;
  const outer = L.sunOuter;
  const inner = L.sunInner;
  const rayPath: string[] = [];
  for (let i = 0; i < rays; i++) {
    const a1 = ((i - 0.35) / rays) * Math.PI * 2;
    const a2 = ((i + 0.35) / rays) * Math.PI * 2;
    const x1 = cx + Math.cos(a1) * inner;
    const y1 = cy + Math.sin(a1) * inner;
    const x2 = cx + Math.cos(a2) * inner;
    const y2 = cy + Math.sin(a2) * inner;
    const xo = cx + Math.cos((a1 + a2) / 2) * outer;
    const yo = cy + Math.sin((a1 + a2) / 2) * outer;
    rayPath.push(
      `M${x1.toFixed(1)},${y1.toFixed(1)} L${xo.toFixed(1)},${yo.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} Z`
    );
  }

  const titleFill = light ? "#ffffff" : "var(--primary)";
  const lineStroke = light ? "#FFC200" : "var(--accent)";
  const subFill = "var(--gold)";

  return (
    <svg
      width={L.w}
      height={L.h}
      viewBox={`0 0 ${L.w} ${L.h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mr. K's Filipino Kitchen"
    >
      <g opacity={0.2}>
        {rayPath.map((p, i) => (
          <path key={i} d={p} fill="var(--gold)" />
        ))}
        <circle cx={cx} cy={cy} r={inner - 0.5} fill="var(--gold-light)" />
      </g>
      <text
        x={L.sunCx}
        y={L.titleY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={titleFill}
        style={{
          fontFamily: "var(--font-playfair), serif",
          fontSize: L.titleFs,
          fontWeight: 700,
        }}
      >
        Mr. K&apos;s
      </text>
      <path
        d={`M${L.sunCx - L.lineHalfW} ${L.lineY} L${L.sunCx + L.lineHalfW} ${L.lineY}`}
        stroke={lineStroke}
        strokeWidth={1.35}
        strokeLinecap="round"
      />
      <text
        x={L.sunCx}
        y={L.subY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={subFill}
        style={{
          fontFamily: "var(--font-dm), system-ui, sans-serif",
          fontSize: L.subFs,
          fontWeight: 600,
          letterSpacing: "0.12em",
        }}
      >
        FILIPINO KITCHEN
      </text>
    </svg>
  );
}
