import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardInclude, toCard } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { EmptyState } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const user = await requireUser("/wishlist");
  const items = await db.wishlistItem.findMany({
    where: { userId: user.id, product: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    include: { product: { include: cardInclude } },
  });
  const products = items.map((i) => toCard(i.product));
  return (
    <div className="container-x pt-8 md:pt-14">
      <h1 className="text-[44px] md:text-[72px]">Your wishlist</h1>
      <p className="mb-10 mt-3 text-[17px]">{products.length ? `${products.length} saved ${products.length === 1 ? "piece" : "pieces"}. Tap the heart to remove one.` : "Save the scents you love and come back to them."}</p>
      {products.length ? (
        <ProductGrid products={products} wishlist={new Set(products.map((p) => p.id))} />
      ) : (
        <EmptyState title="Nothing saved yet" text="Tap the heart on any candle to keep it here." href="/shop" cta="Browse the shop" />
      )}
    </div>
  );
}
