import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, pages] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true, images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 3 } } }).catch(() => []),
    db.category.findMany({ where: { isVisible: true }, select: { slug: true, createdAt: true } }).catch(() => []),
    db.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }).catch(() => []),
  ]);
  return [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: siteUrl(`/collections/${c.slug}`), lastModified: c.createdAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: siteUrl(`/product/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8, images: p.images.map((i) => (i.url.startsWith("http") ? i.url : siteUrl(i.url))) })),
    ...pages.map((p) => ({ url: siteUrl(`/pages/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
