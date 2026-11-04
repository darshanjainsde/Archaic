import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

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
  shortDescription: string | null;
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
    shortDescription: p.shortDescription,
  };
}

export async function listProducts(opts: { where?: Prisma.ProductWhereInput; orderBy?: Prisma.ProductOrderByWithRelationInput[]; take?: number; skip?: number }) {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE", ...(opts.where ?? {}) },
    orderBy: opts.orderBy ?? [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    take: opts.take,
    skip: opts.skip,
    include: cardInclude,
  });
  return rows.map(toCard);
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
      return listProducts({ where: categorySlug ? { category: { slug: categorySlug } } : {}, take: limit });
  }
}

/** Product ids the user has wishlisted (empty when signed out). */
export async function wishlistIds(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await db.wishlistItem.findMany({ where: { userId }, select: { productId: true } });
  return new Set(rows.map((r) => r.productId));
}
