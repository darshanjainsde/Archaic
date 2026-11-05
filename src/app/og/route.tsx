import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";

/** 1200×630 social preview card (WhatsApp, Instagram, Facebook, X, Google Discover). */
export async function GET(req: Request) {
  const s = await getSettings();
  const { bg, ink, muted, paper, paperInk, accent } = s.theme.colors;
  const title = (new URL(req.url).searchParams.get("title") || s.store.tagline || s.seo.title).slice(0, 90);
  const host = (process.env.NEXT_PUBLIC_SITE_URL || "archaiccandles.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: bg, color: ink, display: "flex", padding: 64, fontFamily: "serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingRight: 48 }}>
          <div style={{ fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: muted, fontFamily: "sans-serif" }}>{s.store.name}</div>
          <div style={{ fontSize: title.length > 48 ? 64 : 80, lineHeight: 1.05 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: muted, fontFamily: "sans-serif" }}>
            <div style={{ width: 40, height: 4, background: accent }} />
            {host}
          </div>
        </div>
        <div style={{ width: 360, background: paper, color: paperInk, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
          <div style={{ width: 34, height: 64, background: "#e0a46a", borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", marginBottom: 18 }} />
          <div style={{ width: 150, height: 210, border: `4px solid ${paperInk}`, borderRadius: "18px 18px 10px 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, letterSpacing: 4, textTransform: "uppercase", textAlign: "center", padding: 12, fontFamily: "sans-serif" }}>
            Hand poured
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
