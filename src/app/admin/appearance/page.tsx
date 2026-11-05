import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { AppearanceEditor, type AppearanceTab } from "@/components/admin/appearance-editor";

export const metadata = { title: "Appearance" };

export default async function Appearance({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const [s, cats, products] = await Promise.all([
    getSettings(),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true, parentId: true } }),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true, price: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } }),
  ]);
  return (
    <div>
      <PageHeader title="Appearance" description="Everything customers see: colours, animation, logo, contact details and social links, menu, homepage and footer." />
      <AppearanceEditor
        initial={s}
        categories={cats}
        products={products.map((p) => ({ slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? null }))}
        initialTab={tab as AppearanceTab | undefined}
      />
    </div>
  );
}
