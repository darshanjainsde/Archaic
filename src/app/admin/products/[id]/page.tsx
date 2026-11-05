import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseOptions } from "@/lib/pricing";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { flattenTree, getCategoryTree } from "@/lib/categories";
import type { Personalization, Spec } from "@/lib/types";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } } } }),
    getCategoryTree().then(flattenTree),
  ]);
  if (!p) notFound();
  const specs = Array.isArray(p.specs) ? (p.specs as Spec[]) : [];
  return (
    <div>
      <PageHeader title={p.name} description={`${p.soldCount} sold`} back={{ href: "/admin/products", label: "Products" }} />
      <ProductForm
        key={p.updatedAt.toISOString()}
        categories={categories}
        initial={{
          id: p.id, name: p.name, slug: p.slug, shortDescription: p.shortDescription ?? "", description: p.description, price: p.price, compareAtPrice: p.compareAtPrice, sku: p.sku ?? "",
          stock: p.stock, trackInventory: p.trackInventory, status: p.status, featured: p.featured, isGiftable: p.isGiftable, badge: p.badge ?? "", tags: p.tags, categoryId: p.categoryId,
          images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })), options: parseOptions(p.options), specs, personalization: (p.personalization as Personalization | null) ?? null,
          seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "",
        }}
      />
    </div>
  );
}
