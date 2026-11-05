import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { productsForSource, wishlistIds } from "@/lib/catalog";
import { getCategoryTree } from "@/lib/categories";
import { Hero, type HeroSlide } from "@/components/store/home/hero";
import { HeroPour, type HeroProduct } from "@/components/store/home/hero-pour";
import {
  CategoryTiles, MembershipSection, NewsletterSection, OccasionsSection, ProductsSection, PromoBand, ReviewsSection, RichTextSection, StorySection, UspStrip, type OccasionTile,
} from "@/components/store/home/sections";
import { parseOptions, parsePersonalization } from "@/lib/pricing";
import type { HomeSection } from "@/lib/settings-schema";
import type { Metadata } from "next";
import { ldJson, organizationLd, websiteLd } from "@/lib/seo";

export const metadata: Metadata = { alternates: { canonical: "/" } };

function activeBanners(placement: string) {
  const now = new Date();
  return db.banner.findMany({
    where: { placement, isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

function sourceHref(s: Extract<HomeSection, { type: "products" }>) {
  switch (s.source) {
    case "category": return s.categorySlug ? `/shop?category=${s.categorySlug}` : "/shop";
    case "new": return "/shop?sort=new";
    case "bestsellers": return "/shop?sort=bestsellers";
    default: return "/shop";
  }
}

export default async function HomePage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const sections = settings.home.sections.filter((s) => s.enabled);
  const types = new Set(sections.map((s) => s.type));

  const [heroBanners, promoBanners, categories, reviews, wishlist] = await Promise.all([
    types.has("hero") ? activeBanners("HERO") : [],
    types.has("promo") ? activeBanners("PROMO") : [],
    types.has("categories") ? getCategoryTree() : [],
    types.has("reviews")
      ? db.review.findMany({ where: { isVisible: true, rating: { gte: 4 }, product: { status: "ACTIVE" } }, orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } } })
      : [],
    wishlistIds(user?.id),
  ]);

  const heroSection = sections.find((s): s is Extract<HomeSection, { type: "hero" }> => s.type === "hero");
  const occSections = sections.filter((s): s is Extract<HomeSection, { type: "occasions" }> => s.type === "occasions");
  const [heroProduct, occasionTiles] = await Promise.all([
    heroSection?.productSlug ? loadHeroProduct(heroSection.productSlug, settings.commerce.maxQtyPerLine) : null,
    Promise.all(occSections.map((s) => loadOccasions(s.categorySlug))),
  ]);

  const productLists = await Promise.all(
    sections.map((s) => (s.type === "products" ? productsForSource(s.source, s.limit, s.categorySlug) : Promise.resolve(null))),
  );

  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson([organizationLd(settings), websiteLd(settings)])} />
      {sections.map((s, idx) => {
        switch (s.type) {
          case "hero": {
            if (heroProduct) {
              return (
                <HeroPour key={s.id} heading={s.heading || settings.store.name} text={s.text} ctaLabel={s.ctaLabel} ctaHref={s.ctaHref} product={heroProduct} buyNow={s.buyNow} pour={s.pour} eyebrow={settings.store.tagline} />
              );
            }
            const slides: HeroSlide[] = heroBanners.length
              ? heroBanners.map((b, i) => ({
                  title: i === 0 && s.heading && !b.title ? s.heading : b.title,
                  text: b.subtitle ?? s.text,
                  ctaLabel: b.ctaLabel ?? s.ctaLabel,
                  ctaHref: b.ctaHref ?? s.ctaHref,
                  image: b.image ?? s.image ?? null,
                  mobileImage: b.mobileImage,
                }))
              : [{ title: s.heading || settings.store.name, text: s.text, ctaLabel: s.ctaLabel, ctaHref: s.ctaHref, image: s.image ?? "/images/products/oud-amber-amber.svg" }];
            return <div key={s.id}><Hero slides={slides} storeName={settings.store.name} tagline={settings.store.tagline} /></div>;
          }
          case "usp":
            return <UspStrip key={s.id} items={s.items} />;
          case "occasions": {
            const tiles = occasionTiles[occSections.indexOf(s)] ?? [];
            return <OccasionsSection key={s.id} heading={s.heading} text={s.text} parentSlug={s.categorySlug} tiles={tiles} />;
          }
          case "categories":
            return (
              <CategoryTiles key={s.id} heading={s.heading} text={s.text} categories={categories.filter((c) => c.count > 0).map((c) => ({ slug: c.slug, name: c.name, description: c.description, image: c.image, count: c.count }))} />
            );
          case "products":
            return <ProductsSection key={s.id} heading={s.heading} text={s.text} products={productLists[idx] ?? []} layout={s.layout} href={sourceHref(s)} wishlist={wishlist} />;
          case "promo":
            return promoBanners[0] ? <PromoBand key={s.id} banner={promoBanners[0]} /> : null;
          case "story":
            return <StorySection key={s.id} heading={s.heading} text={s.text} image={s.image ?? null} ctaLabel={s.ctaLabel} ctaHref={s.ctaHref} storeName={settings.store.name} />;
          case "membership":
            return settings.membership.enabled ? <MembershipSection key={s.id} name={settings.membership.name} heading={s.heading} text={s.text} tiers={settings.membership.tiers} /> : null;
          case "reviews":
            return (
              <ReviewsSection key={s.id} heading={s.heading} reviews={reviews.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, name: r.user.name.split(" ")[0], product: r.product.name, slug: r.product.slug, date: r.createdAt, verified: r.isVerified }))} />
            );
          case "newsletter":
            return <NewsletterSection key={s.id} heading={s.heading} text={s.text} />;
          case "richtext":
            return <RichTextSection key={s.id} heading={s.heading} body={s.body} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

async function loadHeroProduct(slug: string, maxQtyPerLine: number): Promise<HeroProduct | null> {
  const p = await db.product.findFirst({ where: { slug, status: "ACTIVE" }, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } }).catch(() => null);
  if (!p) return null;
  const inStock = !p.trackInventory || p.stock > 0;
  return {
    id: p.id, slug: p.slug, name: p.name, shortDescription: p.shortDescription, price: p.price, compareAtPrice: p.compareAtPrice,
    image: p.images[0]?.url ?? null, options: parseOptions(p.options), personalization: parsePersonalization(p.personalization), inStock,
    maxQty: Math.max(1, p.trackInventory ? Math.min(p.stock, maxQtyPerLine) : maxQtyPerLine),
  };
}

/** Sub-categories of `parentSlug` with their active product count and lowest price; empty ones are left out. */
async function loadOccasions(parentSlug: string): Promise<OccasionTile[]> {
  const tree = await getCategoryTree();
  const parent = tree.find((c) => c.slug === parentSlug);
  if (!parent || !parent.children.length) return [];
  const rows = await db.product.groupBy({ by: ["categoryId"], where: { status: "ACTIVE", categoryId: { in: parent.children.map((c) => c.id) } }, _min: { price: true }, _count: { _all: true } }).catch(() => []);
  const byId = new Map(rows.map((r) => [r.categoryId, r]));
  return parent.children
    .map((c) => ({ slug: c.slug, name: c.name, image: c.image ?? parent.image, count: byId.get(c.id)?._count._all ?? 0, from: byId.get(c.id)?._min.price ?? null }))
    .filter((t) => t.count > 0);
}
