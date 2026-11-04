import Link from "next/link";
import { Img } from "@/components/ui/img";
import { Price } from "@/components/ui/price";
import type { ProductCardData } from "@/lib/catalog";
import { WishlistButton } from "./wishlist-button";
import { cn } from "@/lib/utils";

/** The apothecary-label card: the picture, then a paper label carrying name and price. */
export function ProductCard({ p, wishlisted = false, priority = false, className }: { p: ProductCardData; wishlisted?: boolean; priority?: boolean; className?: string }) {
  return (
    <article className={cn("group relative flex flex-col", className)}>
      <Link href={`/product/${p.slug}`} className="flex flex-1 flex-col focus-visible:outline-offset-4" aria-label={`${p.name}, ${p.inStock ? "" : "sold out, "}view details`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-surface" style={{ borderRadius: "var(--radius) var(--radius) 0 0" }}>
          <Img src={p.image} alt={p.name} fill sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 46vw" className="img-zoom object-cover" priority={priority} />
          {p.hoverImage && (
            <Img src={p.hoverImage} alt="" fill sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 46vw" className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
          {!p.inStock && <span className="absolute inset-x-0 bottom-0 bg-bg/85 py-2 text-center text-[14px] font-semibold">Sold out</span>}
        </div>
        <div className="card-label card-lift flex flex-1 flex-col gap-1 px-3 pb-4 pt-3 md:px-4" style={{ borderRadius: "0 0 var(--radius) var(--radius)" }}>
          {p.badge && <span className="text-[13px] font-semibold text-[color:var(--paper-ink)] opacity-75">{p.badge}</span>}
          <h3 className="font-display text-[18px] leading-[1.15] md:text-[21px]">{p.name}</h3>
          <Price price={p.price} compareAt={p.compareAtPrice} size="sm" className="mt-auto pt-2" />
          {p.hasOptions && <span className="text-[13px] opacity-70">Choose scent & colour</span>}
        </div>
      </Link>
      <WishlistButton productId={p.id} initial={wishlisted} className="absolute right-2 top-2 h-10 w-10 justify-center rounded-full bg-paper/90 text-paper-ink" />
    </article>
  );
}

export function ProductGrid({ products, wishlist, priorityCount = 0 }: { products: ProductCardData[]; wishlist?: Set<string>; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} p={p} wishlisted={wishlist?.has(p.id)} priority={i < priorityCount} />
      ))}
    </div>
  );
}
