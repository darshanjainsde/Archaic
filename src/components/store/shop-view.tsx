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
import { renderMarkdown } from "@/lib/markdown";
import { notFound } from "next/navigation";
import { siteUrl } from "@/lib/utils";

const PER_PAGE = 24;
export type SP = Promise<Record<string, string | string[] | undefined>>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Category landing metadata, used by /collections/[slug]. */
export async function categoryMetadata(slug: string, sp: Record<string, string | string[] | undefined>): Promise<Metadata> {
  const c = await db.category.findUnique({ where: { slug }, select: { name: true, description: true, seoTitle: true, seoDescription: true, image: true } });
  if (!c) return { title: "Collection not found", robots: { index: false } };
  const filtered = ["min", "max", "inStock", "sort", "page", "q"].some((k) => one(sp[k]));
  return {
    title: { absolute: c.seoTitle || `${c.name} — buy online in India | Archaic Candles` },
    description: c.seoDescription || c.description?.slice(0, 160) || undefined,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: { title: { absolute: c.seoTitle || `${c.name} — buy online in India | Archaic Candles` }, description: c.seoDescription || c.description || undefined, url: `/collections/${slug}`, ...(c.image && !c.image.endsWith(".svg") ? { images: [c.image] } : {}) },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export async function ShopView({ sp, categorySlug }: { sp: Record<string, string | string[] | undefined>; categorySlug?: string }) {
  const slug = (categorySlug ?? "").slice(0, 80);
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
  if (slug && !category) notFound();
  const categories = cats.filter((c) => c._count.products > 0).map((c) => ({ slug: c.slug, name: c.name, count: c._count.products }));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const activeCount = [slug, min, max, inStock || null].filter(Boolean).length;

  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) { const s = one(v); if (s && k !== "page" && k !== "category") p.set(k, s); }
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    const base = slug ? `/collections/${slug}` : "/shop";
    return qs ? `${base}?${qs}` : base;
  };

  const title = q ? `Results for “${q}”` : category?.name ?? "Scented candles & gifts";
  const intro = q ? `${total} ${total === 1 ? "product" : "products"} found.` : category?.description ?? "Hand-poured soy wax candles, personalised candles and candle gift sets, shipped across India.";

  return (
    <div className="container-x pb-8 pt-8 md:pt-14">
      <div className="mb-8 grid gap-4 md:mb-12 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <h1 className="text-[44px] md:text-[72px]">{title}</h1>
          <p className="mt-3 max-w-xl text-[17px]">{intro}</p>
        </div>
      </div>
      <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
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
      {category && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                { "@type": "CollectionPage", name: category.name, description: category.seoDescription || category.description || undefined, url: siteUrl(`/collections/${category.slug}`) },
                { "@type": "BreadcrumbList", itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
                  { "@type": "ListItem", position: 2, name: "Shop", item: siteUrl("/shop") },
                  { "@type": "ListItem", position: 3, name: category.name, item: siteUrl(`/collections/${category.slug}`) },
                ] },
              ],
            }).replace(/</g, "\\u003c"),
          }}
        />
      )}
      {!q && page === 1 && (
        <section aria-labelledby="more-collections" className="mt-20 grid gap-10 md:mt-28 md:grid-cols-12">
          {category?.content ? (
            <div className="md:col-span-7">
              <h2 className="text-[30px] md:text-[40px]">About our {category.name.toLowerCase()}</h2>
              <div className="prose-store mt-5 max-w-[68ch]" dangerouslySetInnerHTML={{ __html: renderMarkdown(category.content) }} />
            </div>
          ) : (
            <div className="md:col-span-7">
              <h2 className="text-[30px] md:text-[40px]">Hand-poured scented candles, made in India</h2>
              <p className="mt-5 max-w-[68ch] text-[17px]">Every Archaic candle is poured by hand in small batches from natural soy wax with lead-free cotton wicks. Choose the scent, wax colour and label, add a personalised message, and we will wrap it as a gift and ship it anywhere in India.</p>
            </div>
          )}
          <nav aria-labelledby="more-collections" className="md:col-span-4 md:col-start-9">
            <h2 id="more-collections" className="text-[24px]">Shop by collection</h2>
            <ul className="mt-4 space-y-2 text-[17px]">
              {categories.filter((c) => c.slug !== slug).map((c) => (
                <li key={c.slug}><Link href={`/collections/${c.slug}`} className="underline-offset-4 hover:underline">{c.name}</Link></li>
              ))}
              {slug && <li><Link href="/shop" className="underline-offset-4 hover:underline">All candles & gifts</Link></li>}
            </ul>
          </nav>
        </section>
      )}
    </div>
  );
}
