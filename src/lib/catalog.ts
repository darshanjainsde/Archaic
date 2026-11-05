import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { categoryWhere } from "./categories";
import { parseOptions, parsePersonalization } from "./pricing";

/** Shared product-listing queries for the storefront. */
export const cardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 2 },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ProductInclude;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  hoverImage: string | null;
  badge: string | null;
  category: string | null;
  inStock: boolean;
  hasOptions: boolean;
  /** True when the product can go straight into the bag from a card: no required option groups and no required personalisation. */
  quickAdd: boolean;
  shortDescription: string | null;
  /** Visible review average and count; null when there are none (or not loaded). */
  rating: { avg: number; count: number } | null;
};

type WithCard = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function toCard(p: WithCard): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    image: p.images[0]?.url ?? null,
    hoverImage: p.images[1]?.url ?? null,
    badge: p.badge,
    category: p.category?.name ?? null,
    inStock: !p.trackInventory || p.stock > 0,
    hasOptions: Array.isArray(p.options) && (p.options as unknown[]).length > 0,
    quickAdd: !parseOptions(p.options).some((g) => g.required && g.values.length > 0) && !parsePersonalization(p.personalization)?.required,
    shortDescription: p.shortDescription,
    rating: null,
  };
}

/** Adds review averages to a list of cards in one grouped query. */
export async function withRatings(cards: ProductCardData[]): Promise<ProductCardData[]> {
  if (!cards.length) return cards;
  try {
    const rows = await db.review.groupBy({ by: ["productId"], where: { productId: { in: cards.map((c) => c.id) }, isVisible: true }, _avg: { rating: true }, _count: { _all: true } });
    const map = new Map(rows.map((r) => [r.productId, { avg: r._avg.rating ?? 0, count: r._count._all }]));
    return cards.map((c) => ({ ...c, rating: map.get(c.id) ?? null }));
  } catch {
    return cards;
  }
}

export async function listProducts(opts: { where?: Prisma.ProductWhereInput; orderBy?: Prisma.ProductOrderByWithRelationInput[]; take?: number; skip?: number }) {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE", ...(opts.where ?? {}) },
    orderBy: opts.orderBy ?? [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    take: opts.take,
    skip: opts.skip,
    include: cardInclude,
  });
  return withRatings(rows.map(toCard));
}

export type ProductSource = "featured" | "new" | "bestsellers" | "category" | "sale";

export async function productsForSource(source: ProductSource, limit: number, categorySlug?: string | null) {
  switch (source) {
    case "featured": {
      const f = await listProducts({ where: { featured: true }, take: limit });
      return f.length ? f : listProducts({ take: limit });
    }
    case "new":
      return listProducts({ orderBy: [{ createdAt: "desc" }], take: limit });
    case "bestsellers":
      return listProducts({ orderBy: [{ soldCount: "desc" }, { sortOrder: "asc" }], take: limit });
    case "sale":
      return listProducts({ where: { compareAtPrice: { not: null } }, take: limit });
    case "category":
      return listProducts({ where: categorySlug ? categoryWhere(categorySlug) : {}, take: limit });
  }
}

/** Product ids the user has wishlisted (empty when signed out). */
export async function wishlistIds(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await db.wishlistItem.findMany({ where: { userId }, select: { productId: true } });
  return new Set(rows.map((r) => r.productId));
}
