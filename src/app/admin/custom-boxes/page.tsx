import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { getCategoryTree, flattenTree } from "@/lib/categories";
import { PageHeader } from "@/components/admin/ui";
import { BoxesEditor } from "@/components/admin/boxes-editor";

export const metadata = { title: "Custom boxes" };

export default async function CustomBoxesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const [s, products, tree] = await Promise.all([
    getSettings(),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true, price: true, stock: true, trackInventory: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } }),
    getCategoryTree(),
  ]);
  return (
    <div>
      <PageHeader title="Custom boxes" description="Everything the Build your own box page offers: what can go inside, box sizes, decorations, the card and seal, and space for the customer’s own gift." />
      <BoxesEditor
        initial={s.boxes}
        initialTab={tab as never}
        products={products.map((p) => ({ slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? null, stock: p.trackInventory ? p.stock : null }))}
        categories={flattenTree(tree).map((c) => ({ slug: c.slug, name: c.name, parentName: c.parentName }))}
      />
    </div>
  );
}
