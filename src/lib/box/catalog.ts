import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { categoryWhere } from "@/lib/categories";
import { parseOptions, parsePersonalization } from "@/lib/pricing";
import type { StoreSettings } from "@/lib/settings-schema";
import type { BoxCatalog, CatalogDecor, CatalogItem } from "./core";
import type { DecorOption } from "./schema";

const decor = (list: DecorOption[]): CatalogDecor[] =>
  list.filter((d) => d.enabled).map((d) => ({ id: d.id, name: d.name, price: d.price, color: d.color, image: d.image ?? null, pattern: d.pattern }));

/**
 * The box catalog for the builder and the server quote: the owner's settings, plus the live shop
 * products each "products" category allows (their own price, options, photo and stock).
 */
export async function loadBoxCatalog(s: StoreSettings): Promise<BoxCatalog | null> {
  const b = s.boxes;
  if (!b.enabled) return null;
  const categories: BoxCatalog["categories"] = [];
  for (const c of b.categories.filter((x) => x.enabled)) {
    const items: CatalogItem[] = [];
    if (c.kind === "custom") {
      for (const o of c.options.filter((x) => x.enabled)) {
        items.push({ ref: `opt:${c.id}:${o.id}`, categoryId: c.id, name: o.name, price: o.price, image: o.image ?? null, w: o.w, h: o.h, heightCm: o.heightCm, shape: o.shape, color: o.color, details: o.details.filter((d) => d.label.trim() && d.value.trim()) });
      }
    } else {
      const fits = new Map(c.products.map((p) => [p.slug, p]));
      const or: Prisma.ProductWhereInput[] = [];
      if (c.categorySlug === "*") or.push({});
      else if (c.categorySlug) or.push(categoryWhere(c.categorySlug));
      const explicit = c.products.filter((p) => p.enabled).map((p) => p.slug);
      if (explicit.length) or.push({ slug: { in: explicit } });
      const products = or.length
        ? await db.product.findMany({ where: { status: "ACTIVE", OR: or }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } }, take: 60 }).catch(() => [])
        : [];
      for (const p of products) {
        const fit = fits.get(p.slug);
        if (fit && !fit.enabled) continue;
        const f = fit ?? c.fallback;
        const options = parseOptions(p.options);
        const firstHex = options.flatMap((g) => g.values).find((v) => v.hex)?.hex ?? "#d9a35a";
        items.push({
          ref: `prod:${p.id}`, categoryId: c.id, name: p.name, price: p.price, image: p.images[0]?.url ?? null,
          w: f.w, h: f.h, heightCm: f.heightCm, shape: f.shape, color: firstHex, details: [],
          product: { id: p.id, slug: p.slug, options, personalization: parsePersonalization(p.personalization), stock: p.trackInventory ? Math.max(0, p.stock) : null, shortDescription: p.shortDescription },
        });
      }
    }
    if (items.length) categories.push({ id: c.id, name: c.name, items });
  }
  return {
    title: b.title, intro: b.intro, cellCm: b.cellCm, packDays: b.packDays, maxPerOrder: b.maxPerOrder,
    sizes: b.sizes.filter((x) => x.enabled).map(({ id, name, cols, rows, price, depthCm }) => ({ id, name, cols, rows, price, depthCm })),
    finishes: decor(b.finishes), ribbons: decor(b.ribbons), fillers: decor(b.fillers), seals: decor(b.seals), papers: decor(b.card.papers),
    maxMessage: b.card.maxMessage,
    voice: b.card.voiceNote,
    own: { enabled: b.ownGift.enabled && b.ownGift.address.trim().length > 0, maxCells: b.ownGift.maxCells, pickupEnabled: b.ownGift.pickupEnabled, pickupFee: b.ownGift.pickupFee, pickupArea: b.ownGift.pickupArea },
    categories,
  };
}
