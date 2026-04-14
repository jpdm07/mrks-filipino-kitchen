import { ImageResponse } from "next/og";
import { SITE } from "@/lib/config";
import { TAKEOUT_SHARE_HOOK } from "@/lib/takeout-share";

export const runtime = "edge";

export const alt = `${TAKEOUT_SHARE_HOOK} — ${SITE.name}`;

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

function SunMark() {
  const cx = 80;
  const cy = 80;
  const inner = 18;
  const outer = 52;
  const rays = 8;
  const paths: string[] = [];
  for (let i = 0; i < rays; i++) {
    const a1 = ((i - 0.35) / rays) * Math.PI * 2;
    const a2 = ((i + 0.35) / rays) * Math.PI * 2;
    const x1 = cx + Math.cos(a1) * inner;
    const y1 = cy + Math.sin(a1) * inner;
    const x2 = cx + Math.cos(a2) * inner;
    const y2 = cy + Math.sin(a2) * inner;
    const xo = cx + Math.cos((a1 + a2) / 2) * outer;
    const yo = cy + Math.sin((a1 + a2) / 2) * outer;
    paths.push(
      `M${x1.toFixed(1)},${y1.toFixed(1)} L${xo.toFixed(1)},${yo.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} Z`
    );
  }
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      aria-hidden
    >
      <g opacity={0.35}>
        {paths.map((d, i) => (
          <path key={i} d={d} fill="#FFC200" />
        ))}
        <circle
          cx={cx}
          cy={cy}
          r={inner - 1}
          fill="#FFE08A"
        />
      </g>
      <circle cx={cx} cy={cy} r={inner - 4} fill="#E6A800" />
    </svg>
  );
}

const serif = 'Georgia, "Times New Roman", "Liberation Serif", serif';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(165deg, #ffffff 0%, #fff8ec 42%, #ffe9c9 100%)",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            fontFamily: serif,
            color: "#0038a8",
            marginBottom: 8,
          }}
        >
          {TAKEOUT_SHARE_HOOK}
        </div>
        <SunMark />
        <div
          style={{
            marginTop: 12,
            fontSize: 58,
            fontWeight: 700,
            fontFamily: serif,
            color: "#0038a8",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 1000,
            paddingLeft: 48,
            paddingRight: 48,
          }}
        >
          {SITE.name}
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.28em",
            color: "#b8860b",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          FILIPINO KITCHEN
        </div>
      </div>
    ),
    { ...size }
  );
}
