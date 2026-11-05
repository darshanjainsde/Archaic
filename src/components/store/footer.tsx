import Link from "next/link";
import type { StoreSettings } from "@/lib/settings-schema";
import { NewsletterForm } from "./newsletter-form";
import { ArchaicLogo } from "./logo";
import { Img } from "@/components/ui/img";
import { SocialIcon, SOCIAL_LABELS, socialHref, type SocialKey } from "@/components/ui/social-icons";

export function Footer({ settings, pages }: { settings: StoreSettings; pages: { slug: string; title: string }[] }) {
  const s = settings.store;
  // Social icons: shown only for the handles filled in Admin > Appearance > Brand & contact
  const socials = (["instagram", "facebook", "youtube", "pinterest", "x", "whatsapp", "mapsUrl"] as SocialKey[])
    .filter((k) => s[k]?.trim())
    .map((k) => ({ key: k, label: SOCIAL_LABELS[k], href: socialHref(k, s[k]) }));
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 md:mt-24">
      <div className="container-x grid gap-12 border-t border-dashed border-[color:var(--kraft-line)] pt-12 pb-12 md:grid-cols-12 md:pt-16">
        <div className="md:col-span-5">
          <Link href="/" aria-label={`${s.name} home`} className="mb-8 inline-block">
            {s.logoUrl ? <Img src={s.logoUrl} alt={s.name} width={200} height={44} className="h-11 w-auto object-contain" /> : <ArchaicLogo className="brand-logo block h-11 w-auto" title={s.name} />}
          </Link>
          <h2 className="text-3xl md:text-4xl">Letters from the workshop</h2>
          <p className="mb-6 mt-3 max-w-md text-[17px]">{settings.footer.about}</p>
          <NewsletterForm id="footer-news" />
        </div>
        <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-xl">Shop</h3>
            <ul className="text-[16px]">
              {settings.nav.map((l) => (
                <li key={l.href + l.label}><Link className="inline-flex min-h-11 items-center hover:underline underline-offset-4" href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-xl">Help</h3>
            <ul className="text-[16px]">
              {settings.footer.links.map((l) => (
                <li key={l.href + l.label}><Link className="inline-flex min-h-11 items-center hover:underline underline-offset-4" href={l.href}>{l.label}</Link></li>
              ))}
              {pages.map((p) => (
                <li key={p.slug}><Link className="inline-flex min-h-11 items-center hover:underline underline-offset-4" href={`/pages/${p.slug}`}>{p.title}</Link></li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h3 className="mb-4 text-xl">Say hello</h3>
            <ul className="text-[16px]">
              {s.email && <li><a className="inline-flex min-h-11 items-center break-all hover:underline underline-offset-4" href={`mailto:${s.email}`}>{s.email}</a></li>}
              {s.phone && <li><a className="inline-flex min-h-11 items-center hover:underline underline-offset-4" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></li>}
            </ul>
            {socials.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1" aria-label="Follow us">
                {socials.map((x) => (
                  <li key={x.key}><a className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-opacity hover:opacity-70" href={x.href} target="_blank" rel="noopener noreferrer" aria-label={x.label} title={x.label}><SocialIcon name={x.key} /></a></li>
                ))}
              </ul>
            )}
            {s.address && <p className="mt-4 text-[15px] text-muted">{s.address}</p>}
          </div>
        </div>
      </div>
      <div className="container-x pb-8">
        <div className="flex flex-col gap-2 text-[14px] text-muted sm:flex-row sm:justify-between">
          <span>© {year} {s.name}. {settings.commerce.taxNote}.</span>
          {s.gstin && <span>GSTIN {s.gstin}</span>}
        </div>
      </div>
    </footer>
  );
}
