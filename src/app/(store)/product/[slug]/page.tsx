import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { listProducts, wishlistIds } from "@/lib/catalog";
import { parseOptions, parsePersonalization } from "@/lib/pricing";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate, siteUrl } from "@/lib/utils";
import type { Spec } from "@/lib/types";
import { ProductView } from "@/components/store/product/product-view";
import { ReviewForm } from "@/components/store/product/review-form";
import { ProductCard } from "@/components/store/product-card";
import { Stars } from "@/components/ui/stars";

type Params = Promise<{ slug: string }>;

const getProduct = cache(async (slug: string) =>
  db.product.findUnique({
    where: { slug: decodeURIComponent(slug).slice(0, 120) },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: { select: { id: true, name: true, slug: true } } },
  }),
);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p || p.status !== "ACTIVE") return { title: "Product not found", robots: { index: false } };
  const desc = p.seoDescription || p.shortDescription || p.description.replace(/[#*_\[\]()]/g, "").slice(0, 160);
  return {
    title: p.seoTitle || p.name,
    description: desc,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { type: "website", title: p.name, description: desc, images: p.images[0] ? [p.images[0].url] : undefined },
  };
}

function addWorkingDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++;
  }
  return d;
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [p, settings, user] = await Promise.all([getProduct(slug), getSettings(), getCurrentUser()]);
  if (!p) notFound();
  const isAdmin = user?.role === "ADMIN";
  if (p.status !== "ACTIVE" && !isAdmin) notFound();

  const [ratingAgg, reviews, myReview, related, wishlist] = await Promise.all([
    db.review.aggregate({ where: { productId: p.id, isVisible: true }, _avg: { rating: true }, _count: true }),
    db.review.findMany({ where: { productId: p.id, isVisible: true }, orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }], take: 20, include: { user: { select: { name: true } } } }),
    user ? db.review.findUnique({ where: { productId_userId: { productId: p.id, userId: user.id } } }) : null,
    p.categoryId ? listProducts({ where: { categoryId: p.categoryId, id: { not: p.id } }, take: 4 }) : listProducts({ where: { id: { not: p.id } }, take: 4 }),
    wishlistIds(user?.id),
  ]);

  const c = settings.commerce;
  const now = new Date();
  const from = addWorkingDays(now, c.dispatchDays + c.deliveryDaysMin);
  const to = addWorkingDays(now, c.dispatchDays + c.deliveryDaysMax);
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);
  const freeShip = c.freeShippingThreshold === 0 ? "Free shipping on every order." : `Free shipping above ₹${Math.round(c.freeShippingThreshold / 100)}.`;
  const deliveryText = `Dispatched in ${c.dispatchDays || 1} working day${c.dispatchDays === 1 ? "" : "s"}. Arrives around ${fmt(from)} – ${fmt(to)}. ${freeShip}`;

  const specs = (Array.isArray(p.specs) ? (p.specs as Spec[]) : []).filter((s) => s && s.label && s.value);
  const rating = { avg: ratingAgg._avg.rating ?? 0, count: ratingAgg._count };
  const options = parseOptions(p.options);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.shortDescription || p.description.slice(0, 300),
    image: p.images.map((i) => (i.url.startsWith("http") ? i.url : siteUrl(i.url))),
    sku: p.sku || p.id,
    brand: { "@type": "Brand", name: settings.store.name },
    ...(p.category ? { category: p.category.name } : {}),
    offers: {
      "@type": "Offer",
      url: siteUrl(`/product/${p.slug}`),
      priceCurrency: "INR",
      price: (p.price / 100).toFixed(2),
      availability: !p.trackInventory || p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(rating.count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.avg.toFixed(1), reviewCount: rating.count } } : {}),
  };

  return (
    <div className="container-x pt-4 md:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-4 hidden text-[15px] text-muted md:block">
        <Link href="/" className="hover:underline underline-offset-4">Home</Link> <span aria-hidden>/</span>{" "}
        <Link href="/shop" className="hover:underline underline-offset-4">Shop</Link>
        {p.category && (<> <span aria-hidden>/</span> <Link href={`/shop?category=${p.category.slug}`} className="hover:underline underline-offset-4">{p.category.name}</Link></>)}
      </nav>

      <ProductView
        p={{
          id: p.id, slug: p.slug, name: p.name, shortDescription: p.shortDescription, badge: p.badge, price: p.price, compareAtPrice: p.compareAtPrice,
          images: p.images.map((i) => ({ url: i.url, alt: i.alt })), options, personalization: parsePersonalization(p.personalization),
          stock: p.stock, trackInventory: p.trackInventory, maxQtyPerLine: c.maxQtyPerLine, category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
          rating, isDraft: p.status !== "ACTIVE",
        }}
        wishlisted={wishlist.has(p.id)}
        deliveryText={deliveryText}
      >
        <div>
          <details className="details-row" open>
            <summary>Description</summary>
            <div className="prose-store pb-5" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.description) }} />
          </details>
          {specs.length > 0 && (
            <details className="details-row">
              <summary>Details</summary>
              <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-2.5 pb-5 text-[16px]">
                {specs.map((s, i) => (<div key={i} className="contents"><dt className="text-muted">{s.label}</dt><dd>{s.value}</dd></div>))}
              </dl>
            </details>
          )}
          <details className="details-row">
            <summary>Shipping & returns</summary>
            <div className="space-y-3 pb-5 text-[16px]">
              <p>{deliveryText}</p>
              {c.giftWrapEnabled && <p>Add gift wrapping with a handwritten note at checkout.</p>}
              <p>{c.returnsEnabled ? `Returns accepted within ${c.returnDays} days of delivery for unused items.` : "Personalised and used candles can’t be returned. If anything arrives damaged, tell us within 48 hours and we’ll replace it."} <Link href="/pages/returns" className="underline underline-offset-4">Read the policy</Link></p>
            </div>
          </details>
        </div>
      </ProductView>

      <section id="reviews" aria-labelledby="reviews-h" className="mt-20 grid gap-10 md:mt-32 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="reviews-h" className="text-[34px] md:text-[48px]">Reviews</h2>
          {rating.count > 0 ? (
            <div className="mt-4 flex items-center gap-3 text-[17px]"><Stars value={rating.avg} size={20} /> {rating.avg.toFixed(1)} from {rating.count} review{rating.count === 1 ? "" : "s"}</div>
          ) : (
            <p className="mt-4 text-[17px]">No reviews yet. Be the first to tell others how it burns.</p>
          )}
          <div className="mt-8">
            {user ? (
              <ReviewForm productId={p.id} existing={myReview ? { rating: myReview.rating, title: myReview.title, body: myReview.body } : null} />
            ) : (
              <Link href={`/login?next=${encodeURIComponent(`/product/${p.slug}#reviews`)}`} className="btn btn-ghost">Sign in to write a review</Link>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-7 lg:col-start-6">
          {reviews.map((r) => (
            <article key={r.id} className="bg-surface p-6" style={{ borderRadius: "var(--radius)" }}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars value={r.rating} />
                {r.title && <h3 className="text-[20px]">{r.title}</h3>}
              </div>
              <p className="mt-3 whitespace-pre-line text-[17px] leading-relaxed">{r.body}</p>
              <p className="mt-3 text-[14px] text-muted">{r.user.name.split(" ")[0]}{r.isVerified ? " · Verified buyer" : ""} · {formatDate(r.createdAt)}</p>
            </article>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-h" className="mt-20 md:mt-32">
          <h2 id="related-h" className="mb-8 text-[34px] md:text-[48px]">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {related.map((r) => <ProductCard key={r.id} p={r} wishlisted={wishlist.has(r.id)} />)}
          </div>
        </section>
      )}
    </div>
  );
}
