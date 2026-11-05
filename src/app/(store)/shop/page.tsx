import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { ShopView, one, type SP } from "@/components/store/shop-view";

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const q = one(sp.q);
  if (q) return { title: `Search: ${q}`, robots: { index: false, follow: true } };
  const filtered = ["min", "max", "inStock", "sort", "page"].some((k) => one(sp[k]));
  return {
    title: { absolute: "Shop Scented Candles & Candle Gift Sets Online | Archaic" },
    description: "Shop hand-poured scented candles online in India: soy wax jar candles, pillar candles, personalised candles and candle gift hampers for every occasion.",
    alternates: { canonical: "/shop" },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  // Old-style /shop?category=x links permanently move to the clean collection URL
  const legacy = one(sp.category).slice(0, 80);
  if (legacy) {
    const rest = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) { const val = one(v); if (val && k !== "category") rest.set(k, val); }
    permanentRedirect(`/collections/${encodeURIComponent(legacy)}${rest.toString() ? `?${rest}` : ""}`);
  }
  return <ShopView sp={sp} />;
}

