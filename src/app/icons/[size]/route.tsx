import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";

const ALLOWED = new Set([32, 180, 192, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = ALLOWED.has(Number(raw)) ? Number(raw) : 192;
  const maskable = new URL(req.url).searchParams.has("maskable");
  const s = await getSettings();
  const { bg, paper, paperInk } = s.theme.colors;
  const inset = maskable ? size * 0.2 : size * 0.1;
  const letter = (s.store.name.trim()[0] || "A").toUpperCase();
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: size - inset * 2, height: size - inset * 2, background: paper, color: paperInk, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: size * 0.04 }}>
          <div style={{ width: size * 0.06, height: size * 0.12, background: "#e0a46a", borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", marginBottom: size * 0.02 }} />
          <div style={{ fontSize: size * 0.42, lineHeight: 1, fontFamily: "serif" }}>{letter}</div>
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
