import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

/** llms.txt — a plain-text map of the store for AI assistants (ChatGPT, Perplexity, Claude, Gemini). */
export async function GET() {
  const s = await getSettings();
  const [cats, products, pages] = await Promise.all([
    db.category.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, description: true } }),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }], take: 200, select: { slug: true, name: true, price: true, shortDescription: true } }),
    db.page.findMany({ where: { isPublished: true }, select: { slug: true, title: true } }),
  ]).catch(() => [[], [], []] as const);
  const c = s.commerce;
  const lines = [
    `# ${s.store.name}`,
    "",
    `> ${s.seo.description}`,
    "",
    `- Ships across India. Dispatch in ${c.dispatchDays || 1} working day(s), delivery in ${c.deliveryDaysMin}–${c.deliveryDaysMax} days.`,
    c.freeShippingThreshold ? `- Free shipping above ${formatMoney(c.freeShippingThreshold)}; otherwise ${formatMoney(c.flatShipping)}.` : "- Free shipping on every order.",
    `- Payment: UPI, cards, net banking${c.codEnabled ? ", Cash on Delivery" : ""}. Prices in INR, ${c.taxNote.toLowerCase()}.`,
    c.giftWrapEnabled ? "- Gift wrapping and a handwritten gift note are available at checkout." : "",
    s.store.email ? `- Contact: ${s.store.email}` : "",
    "",
    "## Collections",
    ...cats.map((x) => `- [${x.name}](${siteUrl(`/shop?category=${x.slug}`)})${x.description ? `: ${x.description}` : ""}`),
    "",
    "## Products",
    ...products.map((p) => `- [${p.name}](${siteUrl(`/product/${p.slug}`)}): ${formatMoney(p.price)}${p.shortDescription ? `. ${p.shortDescription}` : ""}`),
    "",
    "## Policies & help",
    ...pages.map((p) => `- [${p.title}](${siteUrl(`/pages/${p.slug}`)})`),
    `- [Track an order](${siteUrl("/track")})`,
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
