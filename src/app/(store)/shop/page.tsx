import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { listProducts, wishlistIds } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { ProductGrid } from "@/components/store/product-card";
import { MobileFilterButton, ShopFilters, SortSelect } from "@/components/store/shop-filters";
import { EmptyState } from "@/components/ui/empty";

const PER_PAGE = 24;
type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const slug = one(sp.category);
  const q = one(sp.q);
  if (slug) {
    const c = await db.category.findUnique({ where: { slug }, select: { name: true, description: true } });
    if (c) return { title: c.name, description: c.description ?? undefined, alternates: { canonical: `/shop?category=${slug}` } };
  }
  if (q) return { title: `Search: ${q}`, robots: { index: false } };
  return { title: "Shop all", alternates: { canonical: "/shop" } };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const slug = one(sp.category).slice(0, 80);
  const q = one(sp.q).trim().slice(0, 80);
  const min = /^\d+$/.test(one(sp.min)) ? Number(one(sp.min)) * 100 : null;
  const max = /^\d+$/.test(one(sp.max)) ? Number(one(sp.max)) * 100 : null;
  const inStock = one(sp.inStock) === "1";
  const sort = one(sp.sort) || "featured";
  const page = Math.max(1, Math.min(500, Number.parseInt(one(sp.page), 10) || 1));

  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  const and: Prisma.ProductWhereInput[] = [];
  if (slug) and.push({ category: { slug } });
  if (q) {
    const words = q.split(/\s+/).filter(Boolean).slice(0, 5);
    for (const w of words) {
      and.push({
        OR: [
          { name: { contains: w, mode: "insensitive" } },
          { shortDescription: { contains: w, mode: "insensitive" } },
          { description: { contains: w, mode: "insensitive" } },
          { tags: { has: w.toLowerCase() } },
          { category: { name: { contains: w, mode: "insensitive" } } },
        ],
      });
    }
  }
  if (min !== null || max !== null) and.push({ price: { ...(min !== null ? { gte: min } : {}), ...(max !== null ? { lte: max } : {}) } });
  if (inStock) and.push({ OR: [{ trackInventory: false }, { stock: { gt: 0 } }] });
  if (and.length) where.AND = and;

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "new" ? [{ createdAt: "desc" }]
    : sort === "price-asc" ? [{ price: "asc" }]
    : sort === "price-desc" ? [{ price: "desc" }]
    : sort === "bestsellers" ? [{ soldCount: "desc" }, { sortOrder: "asc" }]
    : [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }];

  const user = await getCurrentUser();
  const [total, products, cats, category, wishlist] = await Promise.all([
    db.product.count({ where }),
    listProducts({ where, orderBy, take: PER_PAGE, skip: (page - 1) * PER_PAGE }),
    db.category.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } } }),
    slug ? db.category.findUnique({ where: { slug } }) : null,
    wishlistIds(user?.id),
  ]);
  const categories = cats.filter((c) => c._count.products > 0).map((c) => ({ slug: c.slug, name: c.name, count: c._count.products }));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const activeCount = [slug, min, max, inStock || null].filter(Boolean).length;

  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) { const s = one(v); if (s && k !== "page") p.set(k, s); }
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  const title = q ? `Results for “${q}”` : category?.name ?? "Shop all";
  const intro = q ? `${total} ${total === 1 ? "product" : "products"} found.` : category?.description ?? "Hand-poured candles, gift sets and everything for a slower evening.";

  return (
    <div className="container-x pb-8 pt-8 md:pt-14">
      <div className="mb-8 grid gap-4 md:mb-12 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <h1 className="text-[44px] md:text-[72px]">{title}</h1>
          <p className="mt-3 max-w-xl text-[17px]">{intro}</p>
        </div>
      </div>
      <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-12">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-28"><Suspense><ShopFilters categories={categories} /></Suspense></div>
        </aside>
        <section aria-label="Products">
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-[15px] text-muted" aria-live="polite">{total} {total === 1 ? "product" : "products"}</p>
            <div className="flex items-center gap-2">
              <Suspense>
                <MobileFilterButton categories={categories} activeCount={activeCount} />
                <SortSelect />
              </Suspense>
            </div>
          </div>
          {products.length ? (
            <ProductGrid products={products} wishlist={wishlist} priorityCount={4} />
          ) : (
            <EmptyState title="Nothing matches yet" text={q ? "Try a different word — a scent like “sandalwood”, or “gift”." : "Try removing a filter to see more."} href="/shop" cta="See all products" />
          )}
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
              {page > 1 && <Link className="btn btn-ghost btn-sm" href={pageHref(page - 1)} rel="prev">Previous</Link>}
              {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === pages).map((n) => (
                <Link key={n} href={pageHref(n)} aria-current={n === page ? "page" : undefined} className={`btn btn-sm ${n === page ? "btn-ink" : "btn-ghost"}`}>{n}</Link>
              ))}
              {page < pages && <Link className="btn btn-ghost btn-sm" href={pageHref(page + 1)} rel="next">Next</Link>}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
