import { getSettings, gatewayConfig } from "@/lib/settings";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm, type SettingsTab } from "@/components/admin/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const [s, products, categories] = await Promise.all([
    getSettings(),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true, price: true, stock: true, trackInventory: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, slug: true, name: true, parentId: true } }),
  ]);
  const g = gatewayConfig();
  return (
    <div>
      <PageHeader title="Settings" description="Delivery charge, free gifts, checkout, payments, membership and how the store looks when shared or searched." />
      <SettingsForm initial={s} gateways={{ ...g }} webhooks={{ razorpay: siteUrl("/api/webhooks/razorpay"), cashfree: siteUrl("/api/webhooks/cashfree") }} initialTab={tab as SettingsTab | undefined}
        categories={categories}
        products={products.map((p) => ({ slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? null, stock: p.trackInventory ? p.stock : null }))}
      />
    </div>
  );
}
