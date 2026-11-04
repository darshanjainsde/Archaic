import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Img } from "@/components/ui/img";
import { Stars } from "@/components/ui/stars";
import { ProductCard, ProductGrid } from "@/components/store/product-card";
import { NewsletterForm } from "@/components/store/newsletter-form";
import type { ProductCardData } from "@/lib/catalog";
import type { MembershipTier } from "@/lib/settings-schema";
import { formatMoney } from "@/lib/money";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

function SectionHead({ heading, text, href, linkLabel = "View all" }: { heading: string; text?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-[34px] md:text-[52px]">{heading}</h2>
        {text && <p className="mt-3 max-w-xl text-[17px]">{text}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-2 text-[15px] font-semibold underline-offset-4 hover:underline">
          {linkLabel} <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function UspStrip({ items }: { items: { title: string; text: string }[] }) {
  if (!items.length) return null;
  return (
    <section aria-label="Why shop with us" className="bg-surface">
      <ul className="container-x grid grid-cols-1 gap-x-8 gap-y-6 py-10 sm:grid-cols-2 lg:grid-cols-4 md:py-12">
        {items.map((u, i) => (
          <li key={i}>
            <h3 className="text-[22px]">{u.title}</h3>
            <p className="mt-1.5 text-[16px] text-muted">{u.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CategoryTiles({ heading, text, categories }: { heading: string; text?: string; categories: { slug: string; name: string; description: string | null; image: string | null; count: number }[] }) {
  if (!categories.length) return null;
  return (
    <section className="container-x">
      <SectionHead heading={heading} text={text} href="/shop" linkLabel="Shop all" />
      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        {categories.map((c) => (
          <Link key={c.slug} href={`/shop?category=${c.slug}`} className="group flex flex-col">
            <div className="relative aspect-square overflow-hidden bg-surface" style={{ borderRadius: "var(--radius) var(--radius) 0 0" }}>
              <Img src={c.image} alt="" fill sizes="(min-width:1024px) 24vw, 48vw" className="img-zoom object-cover" />
            </div>
            <div className="card-label flex items-center justify-between gap-2 px-4 py-3" style={{ borderRadius: "0 0 var(--radius) var(--radius)" }}>
              <span className="font-display text-[20px] leading-tight md:text-[24px]">{c.name}</span>
              <span className="text-[14px] opacity-75">{c.count}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ProductsSection({ heading, text, products, layout, href, wishlist }: { heading: string; text?: string; products: ProductCardData[]; layout: "grid" | "carousel"; href: string; wishlist: Set<string> }) {
  if (!products.length) return null;
  return (
    <section className="container-x">
      <SectionHead heading={heading} text={text} href={href} />
      {layout === "carousel" ? (
        <div className="snap-row no-scrollbar -mx-4 auto-cols-[68%] gap-3 px-4 sm:auto-cols-[42%] md:-mx-8 md:auto-cols-[30%] md:gap-5 md:px-8 xl:auto-cols-[calc((100%-60px)/4)]" style={{ scrollPaddingInline: "16px" }}>
          {products.map((p) => (
            <ProductCard key={p.id} p={p} wishlisted={wishlist.has(p.id)} />
          ))}
        </div>
      ) : (
        <ProductGrid products={products} wishlist={wishlist} />
      )}
    </section>
  );
}

export function PromoBand({ banner }: { banner: { title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; image: string | null; bgColor: string | null; textColor: string | null } }) {
  const bg = banner.bgColor && /^#[0-9a-f]{6}$/i.test(banner.bgColor) ? banner.bgColor : "var(--field)";
  const fg = banner.textColor && /^#[0-9a-f]{6}$/i.test(banner.textColor) ? banner.textColor : "var(--field-ink)";
  return (
    <section style={{ background: bg, color: fg }}>
      <div className="container-x grid items-center gap-8 py-14 md:grid-cols-2 md:gap-14 md:py-20">
        <div>
          <h2 className="text-[38px] md:text-[60px]">{banner.title}</h2>
          {banner.subtitle && <p className="mt-4 max-w-md text-[18px]">{banner.subtitle}</p>}
          {banner.ctaLabel && banner.ctaHref && (
            <Link href={banner.ctaHref} className="btn mt-8" style={{ background: fg, color: bg }}>{banner.ctaLabel}</Link>
          )}
        </div>
        {banner.image && (
          <div className="relative aspect-[4/3] overflow-hidden" style={{ borderRadius: "var(--radius)" }}>
            <Img src={banner.image} alt="" fill sizes="(min-width:768px) 45vw, 100vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

export function StorySection({ heading, text, image, ctaLabel, ctaHref, storeName }: { heading: string; text: string; image: string | null; ctaLabel: string; ctaHref: string; storeName: string }) {
  return (
    <section className="container-x grid items-center gap-8 md:grid-cols-12 md:gap-6">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface md:col-span-5" style={{ borderRadius: "var(--radius)" }}>
        <Img src={image || "/images/products/pillar-trio-ivory.svg"} alt="" fill sizes="(min-width:768px) 40vw, 100vw" className="object-cover" />
      </div>
      <div className="label-panel p-7 md:col-span-6 md:col-start-7 md:p-12">
        <h2 className="text-[36px] md:text-[54px]">{heading}</h2>
        <div className="perforated my-6" aria-hidden />
        <p className="text-[18px] leading-relaxed md:text-[20px]">{text}</p>
        <p className="mt-6 font-display text-[20px] italic">— The {storeName} workshop</p>
        {ctaLabel && ctaHref && (
          <Link href={ctaHref} className="mt-8 inline-flex items-center gap-2 text-[16px] font-semibold underline underline-offset-4">{ctaLabel} <ArrowRight size={16} aria-hidden /></Link>
        )}
      </div>
    </section>
  );
}

/** Membership tiers set as a printed price list with dotted leaders. */
export function MembershipSection({ name, heading, text, tiers }: { name: string; heading: string; text: string; tiers: MembershipTier[] }) {
  const sorted = [...tiers].sort((a, b) => a.minSpend - b.minSpend);
  return (
    <section className="bg-field text-field-ink">
      <div className="container-x grid gap-10 py-16 md:grid-cols-12 md:py-24">
        <div className="md:col-span-5">
          <h2 className="text-[38px] md:text-[44px] lg:text-[60px]">{heading || name}</h2>
          <p className="mt-4 max-w-md text-[18px]">{text || `Every order counts towards ${name}. Spend more over time and every future order costs less — automatically.`}</p>
          <Link href="/account/membership" className="btn btn-ink mt-8">See my membership</Link>
        </div>
        <div className="label-panel p-7 md:col-span-6 md:col-start-7 md:p-10">
          <h3 className="text-center text-[28px] md:text-[34px]">{name}</h3>
          <div className="mt-8 space-y-8">
            {sorted.map((t) => (
              <div key={t.name}>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[22px]">{t.name}</span>
                  <span className="mb-1 flex-1 border-b-4 border-dotted border-current opacity-30" aria-hidden />
                  <span className="text-[17px] font-semibold">{t.discountPct > 0 ? `${t.discountPct}% off` : "Free to join"}</span>
                </div>
                <p className="mt-1 text-[15px] opacity-80">{t.minSpend > 0 ? `From ${formatMoney(t.minSpend)} lifetime spend` : "From your first order"}{t.perks.length ? ` · ${t.perks.join(" · ")}` : ""}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReviewsSection({ heading, reviews }: { heading: string; reviews: { id: string; rating: number; title: string | null; body: string; name: string; product: string; slug: string; date: Date; verified: boolean }[] }) {
  if (!reviews.length) return null;
  return (
    <section className="container-x">
      <SectionHead heading={heading} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <figure key={r.id} className="flex flex-col gap-3 bg-surface p-6" style={{ borderRadius: "var(--radius)" }}>
            <Stars value={r.rating} />
            {r.title && <h3 className="text-[22px]">{r.title}</h3>}
            <blockquote className="text-[17px] leading-relaxed">“{r.body}”</blockquote>
            <figcaption className="mt-auto pt-2 text-[15px] text-muted">
              {r.name}{r.verified ? ", verified buyer" : ""} · <Link href={`/product/${r.slug}`} className="underline underline-offset-4">{r.product}</Link> · {formatDate(r.date)}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function NewsletterSection({ heading, text }: { heading: string; text: string }) {
  return (
    <section className="container-x">
      <div className="grid gap-8 bg-surface p-7 md:grid-cols-2 md:items-end md:p-14" style={{ borderRadius: "var(--radius)" }}>
        <div>
          <h2 className="text-[34px] md:text-[48px]">{heading}</h2>
          {text && <p className="mt-3 max-w-md text-[17px]">{text}</p>}
        </div>
        <NewsletterForm id="home-news" />
      </div>
    </section>
  );
}

export function RichTextSection({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="container-x grid gap-6 md:grid-cols-12">
      {heading && <h2 className="text-[34px] md:col-span-4 md:text-[48px]">{heading}</h2>}
      <div className={`prose-store ${heading ? "md:col-span-7 md:col-start-6" : "md:col-span-8"}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
    </section>
  );
}
