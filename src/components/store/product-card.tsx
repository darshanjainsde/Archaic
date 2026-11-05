import Link from "next/link";
import { Img } from "@/components/ui/img";
import { Stars } from "@/components/ui/stars";
import type { ProductCardData } from "@/lib/catalog";
import { discountPercent, formatMoney } from "@/lib/money";
import { WishlistButton } from "./wishlist-button";
import { QuickAddButton } from "./quick-add-button";
import { cn } from "@/lib/utils";

/** The parcel card: a kraft frame round the photo, a wax-seal badge, and a perforated paper label carrying name, scent, stars and price with "+ Add". */
export function ProductCard({ p, wishlisted, priority = false, className }: { p: ProductCardData; wishlisted?: boolean; priority?: boolean; className?: string }) {
  const off = discountPercent(p.price, p.compareAtPrice);
  const href = `/product/${p.slug}`;
  return (
    <article className={cn("parcel group", className)}>
      <div className="parcel-img">
        <Img src={p.image} alt="" fill sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 46vw" className="parcel-a object-cover" priority={priority} />
        {p.hoverImage && <Img src={p.hoverImage} alt="" fill sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 46vw" className="parcel-b object-cover" />}
        {!p.inStock && <span className="absolute inset-x-0 bottom-0 bg-bg/85 py-2 text-center text-[14px] font-semibold text-ink">Sold out</span>}
      </div>
      {p.badge && <span className={cn("wax-seal", /^new$/i.test(p.badge.trim()) && "wax-seal-new")}>{p.badge}</span>}
      <WishlistButton productId={p.id} initial={wishlisted} className="absolute right-2 top-2 z-[2] h-11 w-11 justify-center rounded-full bg-paper/90 text-paper-ink" />
      <div className="parcel-label">
        <h3 className="parcel-name">
          <Link href={href} className="parcel-link">{p.name}</Link>
        </h3>
        {(p.shortDescription || p.category) && <p className="parcel-line">{p.shortDescription || p.category}</p>}
        {p.rating && p.rating.count > 0 && (
          <p className="parcel-stars"><Stars value={p.rating.avg} size={12} /> <small>{p.rating.avg.toFixed(1)} · {p.rating.count}</small></p>
        )}
        <div className="parcel-row">
          <p className="parcel-price">
            <span className="tabular-nums">{formatMoney(p.price)}</span>
            {off > 0 && <><s className="tabular-nums">{formatMoney(p.compareAtPrice!)}</s><em>{off}% off</em></>}
          </p>
          {!p.inStock ? (
            <span className="parcel-add parcel-add-off" aria-hidden>Sold out</span>
          ) : p.quickAdd ? (
            <QuickAddButton id={p.id} slug={p.slug} name={p.name} price={p.price} image={p.image} />
          ) : (
            <Link href={href} className="parcel-add" aria-label={`Choose options for ${p.name}`}>+ Add</Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, wishlist, priorityCount = 0 }: { products: ProductCardData[]; wishlist?: Set<string>; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} p={p} wishlisted={wishlist?.has(p.id)} priority={i < priorityCount} />
      ))}
    </div>
  );
}
