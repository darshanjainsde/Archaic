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
    <div className="sec-head">
      <div>
        <h2 className="text-[34px] md:text-[52px]">{heading}</h2>
        {text && <p className="mt-3 max-w-xl text-[17px] text-muted">{text}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold underline-offset-4 hover:underline md:self-auto">
          {linkLabel} <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}

const USP_ICONS = {
  jar: <><path d="M6 9h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" /><path d="M12 9V6m0 0c-1.5-2 1.5-3 0-5" /><path d="M8 9V7h8v2" /></>,
  tag: <><path d="M4 7h11l5 5-5 5H4z" /><circle cx="7.5" cy="12" r="1.2" /></>,
  gift: <><rect x="3" y="9" width="18" height="12" /><path d="M3 9h18M12 9v12M12 9c-4-1-5-4-3-5s3 2 3 5c0-3 1-6 3-5s-1 4-3 5" /></>,
  truck: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
};
type UspIcon = keyof typeof USP_ICONS;
const USP_ORDER: UspIcon[] = ["jar", "tag", "gift", "truck"];
/** The icon follows what the line is about; unknown lines fall back to their position. */
function uspIcon(title: string, i: number): UspIcon {
  const t = title.toLowerCase();
  if (/ship|deliver|india|dispatch|courier/.test(t)) return "truck";
  if (/gift|wrap|note/.test(t)) return "gift";
  if (/scent|label|choose|your|personal/.test(t)) return "tag";
  if (/pour|wax|soy|hand|candle/.test(t)) return "jar";
  return USP_ORDER[i % USP_ORDER.length];
}

export function UspStrip({ items }: { items: { title: string; text: string }[] }) {
  if (!items.length) return null;
  return (
    <section aria-label="Why shop with us" className="container-x">
      <ul className="usp-list" style={{ "--usp-cols": Math.min(4, items.length) } as React.CSSProperties}>
        {items.map((u, i) => (
          <li key={i}>
            <span className="usp-hex" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{USP_ICONS[uspIcon(u.title, i)]}</svg>
            </span>
            <div className="min-w-0">
              <h3>{u.title}</h3>
              <p>{u.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type OccasionTile = { slug: string; name: string; image: string | null; count: number; from: number | null };

/** Gift tags: the sub-categories of one category as photo tiles with a kraft chip ("5 gifts · from ₹1,499"). */
export function OccasionsSection({ heading, text, parentSlug, tiles }: { heading: string; text: string; parentSlug: string; tiles: OccasionTile[] }) {
  if (!tiles.length) return null;
  const cols = tiles.length <= 6 ? tiles.length : Math.ceil(tiles.length / 2);
  return (
    <section className="reveal container-x" aria-labelledby="occ-h">
      <div className="sec-head">
        <div>
          <h2 id="occ-h" className="text-[34px] md:text-[52px]">{heading}</h2>
          {text && <p className="mt-3 max-w-xl text-[17px] text-muted">{text}</p>}
        </div>
        <Link href={`/shop?category=${parentSlug}`} className="inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold underline-offset-4 hover:underline md:self-auto">
          All gift sets <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
      <div className="occ" style={{ "--occ-cols": cols } as React.CSSProperties}>
        {tiles.map((t) => (
          <Link key={t.slug} href={`/shop?category=${t.slug}`} className="occ-tile">
            <Img src={t.image} alt="" fill sizes="(min-width:1024px) 20vw, 50vw" className="object-cover" />
            <span className="occ-tx">
              <span className="occ-name">{t.name}</span>
              <span className="occ-chip">{t.count} {t.count === 1 ? "gift" : "gifts"}{t.from !== null && <><i aria-hidden /> from {formatMoney(t.from)}</>}</span>
              <span className="occ-go" aria-hidden>Shop {t.name.toLowerCase()} →</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CategoryTiles({ heading, text, categories }: { heading: string; text?: string; categories: { slug: string; name: string; description: string | null; image: string | null; count: number }[] }) {
  if (!categories.length) return null;
  return (
    <section className="reveal container-x">
      <SectionHead heading={heading} text={text} href="/shop" linkLabel="Shop all" />
      <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
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
    <section className="reveal container-x">
      <SectionHead heading={heading} text={text} href={href} />
      {layout === "carousel" ? (
        <div className="snap-row no-scrollbar -mx-4 auto-cols-[68%] gap-3 px-4 py-2 sm:auto-cols-[42%] md:-mx-8 md:auto-cols-[30%] md:gap-6 md:px-8 xl:auto-cols-[calc((100%-72px)/4)]" style={{ scrollPaddingInline: "16px" }}>
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
  const custom = Boolean(banner.bgColor && /^#[0-9a-f]{6}$/i.test(banner.bgColor));
  const bg = custom ? banner.bgColor! : "transparent";
  const fg = custom && banner.textColor && /^#[0-9a-f]{6}$/i.test(banner.textColor) ? banner.textColor : custom ? "#ffffff" : "var(--ink)";
  return (
    <section className="reveal container-x">
      <div className={`grid items-center gap-8 md:grid-cols-2 md:gap-12 ${custom ? "p-6 md:p-12" : ""}`} style={{ background: bg, color: fg, borderRadius: "var(--r-card)" }}>
        <div>
          <h2 className="text-[38px] md:text-[60px]">{banner.title}</h2>
          {banner.subtitle && <p className="mt-4 max-w-md text-[18px]">{banner.subtitle}</p>}
          {banner.ctaLabel && banner.ctaHref && (
            <Link href={banner.ctaHref} className="btn mt-8" style={custom ? { background: fg, color: bg } : { background: "var(--accent)", color: "var(--accent-ink)" }}>{banner.ctaLabel}</Link>
          )}
        </div>
        {banner.image && (
          <div className="relative aspect-[4/3] overflow-hidden" style={{ borderRadius: custom ? "var(--r-inner)" : "var(--r-card)" }}>
            <Img src={banner.image} alt="" fill sizes="(min-width:768px) 45vw, 100vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

export function StorySection({ heading, text, image, ctaLabel, ctaHref, storeName }: { heading: string; text: string; image: string | null; ctaLabel: string; ctaHref: string; storeName: string }) {
  return (
    <section className="reveal container-x grid items-center gap-8 md:grid-cols-12 md:gap-6">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface md:col-span-5" style={{ borderRadius: "var(--radius)" }}>
        <Img src={image || "/images/products/pillar-trio-ivory.svg"} alt="" fill sizes="(min-width:768px) 40vw, 100vw" className="object-cover" />
      </div>
      <div className="label-panel p-6 md:col-span-6 md:col-start-7 md:p-12">
        <h2 className="text-[36px] md:text-[54px]">{heading}</h2>
        <div className="perforated my-6" aria-hidden />
        <p className="text-[18px] leading-relaxed md:text-[20px]">{text}</p>
        <p className="mt-6 font-display text-[20px] italic">— The {storeName} workshop</p>
        {ctaLabel && ctaHref && (
          <Link href={ctaHref} className="mt-8 inline-flex min-h-11 items-center gap-2 text-[16px] font-semibold underline underline-offset-4">{ctaLabel} <ArrowRight size={16} aria-hidden /></Link>
        )}
      </div>
    </section>
  );
}

/** Membership tiers set as a printed price list with dotted leaders. */
export function MembershipSection({ name, heading, text, tiers }: { name: string; heading: string; text: string; tiers: MembershipTier[] }) {
  const sorted = [...tiers].sort((a, b) => a.minSpend - b.minSpend);
  return (
    <section>
      <div className="reveal container-x grid gap-8 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-5">
          <h2 className="text-[38px] md:text-[44px] lg:text-[60px]">{heading || name}</h2>
          <p className="mt-4 max-w-md text-[18px] text-muted">{text || `Every order counts towards ${name}. Spend more over time and every future order costs less — automatically.`}</p>
          <Link href="/account/membership" className="btn btn-primary mt-8">See my membership</Link>
        </div>
        <div className="label-panel p-6 md:col-span-6 md:col-start-7 md:p-12">
          <h3 className="text-center text-[28px] md:text-[34px]">{name}</h3>
          <div className="mt-8 space-y-6">
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
    <section className="reveal container-x">
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
    <section className="reveal container-x">
      <div className="grid gap-8 bg-surface p-6 md:grid-cols-2 md:items-end md:p-12" style={{ borderRadius: "var(--radius)" }}>
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
