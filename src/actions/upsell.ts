"use server";
import { getSettings } from "@/lib/settings";
import { listProducts, productsForSource, type ProductCardData } from "@/lib/catalog";
import { categoryWhere } from "@/lib/categories";

/**
 * Products to suggest in the bag / at checkout so the shopper reaches the next milestone (free delivery or a gift).
 * Order: items that close the gap on their own (cheapest first), then the rest (closest to the gap first).
 * Items already in the bag are left out. Prices are display-only; the server re-quotes everything.
 */
export async function upsellProducts(input: { remaining: number; exclude: string[]; place?: "bag" | "checkout" }): Promise<{ heading: string; products: ProductCardData[] } | null> {
  const s = await getSettings();
  const u = s.commerce.upsell;
  if (!u?.enabled) return null;
  if (input.place === "checkout" && !u.onCheckout) return null;
  const exclude = new Set((input.exclude ?? []).slice(0, 50).map(String));
  const pool =
    u.source === "category" && u.categorySlug
      ? await listProducts({ where: categoryWhere(u.categorySlug), take: 40 })
      : await productsForSource(u.source === "category" ? "bestsellers" : u.source, 40);
  const remaining = Math.max(0, Math.trunc(Number(input.remaining) || 0));
  const candidates = (pool ?? []).filter((p) => p.inStock && !exclude.has(p.id));
  const closes = candidates.filter((p) => remaining > 0 && p.price >= remaining).sort((a, b) => a.price - b.price);
  const rest = candidates.filter((p) => !(remaining > 0 && p.price >= remaining)).sort((a, b) => (remaining > 0 ? Math.abs(remaining - a.price) - Math.abs(remaining - b.price) : 0));
  const products = [...closes, ...rest].slice(0, u.limit);
  return products.length ? { heading: u.heading, products } : null;
}
