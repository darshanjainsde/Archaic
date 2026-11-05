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
import { breadcrumbLd, ldJson, socialImage } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";
import { categoryWhere } from "@/lib/categories";
import { Img } from "@/components/ui/img";

const PER_PAGE = 24;
type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const slug = one(sp.category);
  const q = one(sp.q);
  if (slug) {
    const c = await db.category.findUnique({ where: { slug }, select: { name: true, description: true } });
    if (c) {
      const title = `${c.name} — Buy Online in India`;
      const description = c.description || `Shop ${c.name.toLowerCase()} from Archaic Candles: hand-poured soy wax, gift-ready packaging, delivered across India.`;
      const og = { title, description, images: [socialImage(null, c.name)] };
      return { title, description, alternates: { canonical: `/shop?category=${slug}` }, openGraph: og, twitter: { card: "summary_large_image", ...og } };
    }
  }
  if (q) return { title: `Search: ${q}`, robots: { index: false, follow: true } };
  // filtered / sorted / paginated views: keep them crawlable but out of the index
  const filtered = ["min", "max", "inStock", "sort", "page"].some((k) => one(sp[k]));
  const title = "Shop Scented Candles & Candle Gift Sets";
  const description = "Browse hand-poured soy wax scented candles, pillar candles, candle gift sets and accessories. Personalise the label, add gift wrap, delivered across India.";
  const og = { title, description, images: [socialImage(null, "Hand-poured candles & gift sets")] };
  return { title, description, alternates: { canonical: "/shop" }, openGraph: og, twitter: { card: "summary_large_image", ...og }, ...(filtered ? { robots: { index: false, follow: true } } : {}) };
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
  // a parent category includes its sub-categories
  if (slug) and.push(categoryWhere(slug));
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
  // counts include sub-categories, so a parent whose products all live in its children still shows up
  const fullCount = (c: (typeof cats)[number]) => c._count.products + cats.filter((k) => k.parentId === c.id).reduce((n, k) => n + k._count.products, 0);
  // parents in order, each followed by its own sub-categories
  const categories = cats
    .filter((c) => !c.parentId || !cats.some((p) => p.id === c.parentId))
    .flatMap((c) => [
      { slug: c.slug, name: c.name, count: fullCount(c) },
      ...cats.filter((k) => k.parentId === c.id).map((k) => ({ slug: k.slug, name: k.name, count: k._count.products, sub: true })),
    ])
    .filter((c) => c.count > 0);
  // sub-category tiles: the chosen category's children, or its siblings when a sub-category is chosen
  const chosen = category ? cats.find((c) => c.id === category.id) : undefined;
  const tileParent = chosen ? (chosen.parentId ? cats.find((c) => c.id === chosen.parentId) : chosen) : undefined;
  const tileKids = tileParent ? cats.filter((c) => c.parentId === tileParent.id && c._count.products > 0) : [];
  const subTiles = tileParent && tileKids.length
    ? [
        { slug: tileParent.slug, name: `All ${tileParent.name.toLowerCase()}`, image: tileParent.image, count: fullCount(tileParent), current: tileParent.id === chosen?.id },
        ...tileKids.map((c) => ({ slug: c.slug, name: c.name, image: c.image ?? tileParent.image, count: c._count.products, current: c.id === chosen?.id })),
      ]
    : [];
  const tileQs = (s: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) { const x = one(v); if (x && k !== "page" && k !== "category") p.set(k, x); }
    p.set("category", s);
    return `/shop?${p.toString()}`;
  };
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

  const listPath = category ? `/shop?category=${category.slug}` : "/shop";
  const jsonLd = q ? null : [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      url: siteUrl(listPath),
      ...(intro ? { description: intro } : {}),
      isPartOf: { "@id": siteUrl("/#website") },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: total,
        itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: (page - 1) * PER_PAGE + i + 1, url: siteUrl(`/product/${p.slug}`), name: p.name })),
      },
    },
    breadcrumbLd([{ name: "Home", path: "/" }, { name: "Shop", path: "/shop" }, ...(category ? [{ name: category.name, path: listPath }] : [])]),
  ];

  return (
    <div className="container-x pb-8 pt-8 md:pt-14">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(jsonLd)} />}
      <div className="mb-8 grid gap-4 md:mb-12 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <h1 className="text-[44px] md:text-[72px]">{title}</h1>
          <p className="mt-3 max-w-xl text-[17px]">{intro}</p>
        </div>
      </div>
      {subTiles.length > 0 && (
        <nav aria-label="Sub-categories" className="subcats mb-12">
          {subTiles.map((t) => (
            <Link key={t.slug} href={tileQs(t.slug)} className="subcat" aria-current={t.current ? "page" : undefined}>
              <span className="subcat-ph"><Img src={t.image} alt="" fill sizes="(min-width:768px) 48px, 45vw" className="object-cover" /></span>
              <span className="subcat-t">{t.name}<small>{t.count} {t.count === 1 ? "product" : "products"}</small></span>
            </Link>
          ))}
        </nav>
      )}
      <div className="grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)]">
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
