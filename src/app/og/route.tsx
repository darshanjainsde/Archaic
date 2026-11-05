import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";

/** Default 1200×630 share image (WhatsApp, Instagram, Facebook, X, Google Discover), drawn from the live theme. */
export async function GET() {
  const s = await getSettings();
  const { bg, paper, paperInk, ink, sale } = s.theme.colors;
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: bg, display: "flex", padding: 56, gap: 48 }}>
        <div style={{ flex: 1, background: paper, color: paperInk, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56 }}>
          <div style={{ fontSize: 30, fontFamily: "serif" }}>{s.store.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 68, lineHeight: 1.02, fontFamily: "serif", letterSpacing: -1.5 }}>Luxury scented candles & candle gift sets</div>
            <div style={{ fontSize: 28, opacity: 0.8 }}>Hand-poured in soy wax · Shipped across India</div>
          </div>
        </div>
        <div style={{ width: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 30 }}>
          <div style={{ width: 34, height: 64, background: sale, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", marginBottom: 14 }} />
          <div style={{ width: 220, height: 300, background: paper, display: "flex", alignItems: "center", justifyContent: "center", color: paperInk, fontSize: 26, fontFamily: "serif" }}>ARCHAIC</div>
          <div style={{ marginTop: 18, color: ink, fontSize: 22 }}>archaiccandles.com</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
