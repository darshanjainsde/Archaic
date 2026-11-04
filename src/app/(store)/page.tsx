import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { productsForSource, wishlistIds } from "@/lib/catalog";
import { Hero, type HeroSlide } from "@/components/store/home/hero";
import {
  CategoryTiles, MembershipSection, NewsletterSection, ProductsSection, PromoBand, ReviewsSection, RichTextSection, StorySection, UspStrip,
} from "@/components/store/home/sections";
import type { HomeSection } from "@/lib/settings-schema";

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
    types.has("categories")
      ? db.category.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } } })
      : [],
    types.has("reviews")
      ? db.review.findMany({ where: { isVisible: true, rating: { gte: 4 }, product: { status: "ACTIVE" } }, orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } } })
      : [],
    wishlistIds(user?.id),
  ]);

  const productLists = await Promise.all(
    sections.map((s) => (s.type === "products" ? productsForSource(s.source, s.limit, s.categorySlug) : Promise.resolve(null))),
  );

  return (
    <div className="flex flex-col gap-20 md:gap-32">
      {sections.map((s, idx) => {
        switch (s.type) {
          case "hero": {
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
            return <div key={s.id} className={sections[idx - 1]?.type === "hero" ? "-mt-10 md:-mt-20" : ""}><UspStrip items={s.items} /></div>;
          case "categories":
            return (
              <CategoryTiles key={s.id} heading={s.heading} text={s.text} categories={categories.filter((c) => c._count.products > 0).map((c) => ({ slug: c.slug, name: c.name, description: c.description, image: c.image, count: c._count.products }))} />
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
