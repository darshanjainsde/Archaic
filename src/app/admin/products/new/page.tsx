import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { flattenTree, getCategoryTree } from "@/lib/categories";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  const categories = await getCategoryTree().then(flattenTree);
  return (
    <div>
      <PageHeader title="New product" back={{ href: "/admin/products", label: "Products" }} />
      <ProductForm
        categories={categories}
        initial={{ id: null, name: "", slug: "", shortDescription: "", description: "", price: null, compareAtPrice: null, sku: "", stock: 20, trackInventory: true, status: "ACTIVE", featured: false, isGiftable: true, badge: "", tags: [], categoryId: null, images: [], options: [], specs: [], personalization: null, seoTitle: "", seoDescription: "" }}
      />
    </div>
  );
}
