import { ImageResponse } from "next/og";
import { PhilippineSun } from "@/components/PhilippineSun";
import { SITE } from "@/lib/config";
import { TAKEOUT_SHARE_HOOK } from "@/lib/takeout-share";

export const runtime = "edge";

export const alt = `${TAKEOUT_SHARE_HOOK} — ${SITE.name}`;

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

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
            color: "#0e1d35",
            marginBottom: 8,
          }}
        >
          {TAKEOUT_SHARE_HOOK}
        </div>
        <div style={{ opacity: 0.92 }}>
          <PhilippineSun size={160} color="#FFC200" decorative />
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 58,
            fontWeight: 700,
            fontFamily: serif,
            color: "#0e1d35",
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
