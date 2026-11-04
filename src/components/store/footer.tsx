import Link from "next/link";
import type { StoreSettings } from "@/lib/settings-schema";
import { NewsletterForm } from "./newsletter-form";

export function Footer({ settings, pages }: { settings: StoreSettings; pages: { slug: string; title: string }[] }) {
  const s = settings.store;
  const socials = [
    { label: "Instagram", href: s.instagram },
    { label: "Facebook", href: s.facebook },
    { label: "YouTube", href: s.youtube },
    { label: "Pinterest", href: s.pinterest },
  ].filter((x) => x.href);
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-surface md:mt-40">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <h2 className="text-3xl md:text-4xl">Letters from the workshop</h2>
          <p className="mb-6 mt-3 max-w-md text-[17px]">{settings.footer.about}</p>
          <NewsletterForm id="footer-news" />
        </div>
        <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-xl">Shop</h3>
            <ul className="space-y-2.5 text-[16px]">
              {settings.nav.map((l) => (
                <li key={l.href + l.label}><Link className="hover:underline underline-offset-4" href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-xl">Help</h3>
            <ul className="space-y-2.5 text-[16px]">
              {settings.footer.links.map((l) => (
                <li key={l.href + l.label}><Link className="hover:underline underline-offset-4" href={l.href}>{l.label}</Link></li>
              ))}
              {pages.map((p) => (
                <li key={p.slug}><Link className="hover:underline underline-offset-4" href={`/pages/${p.slug}`}>{p.title}</Link></li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h3 className="mb-4 text-xl">Say hello</h3>
            <ul className="space-y-2.5 text-[16px]">
              {s.email && <li><a className="break-all hover:underline underline-offset-4" href={`mailto:${s.email}`}>{s.email}</a></li>}
              {s.phone && <li><a className="hover:underline underline-offset-4" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></li>}
              {s.whatsapp && <li><a className="hover:underline underline-offset-4" href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp us</a></li>}
              {socials.map((x) => (
                <li key={x.label}><a className="hover:underline underline-offset-4" href={x.href} target="_blank" rel="noopener noreferrer">{x.label}</a></li>
              ))}
            </ul>
            {s.address && <p className="mt-4 text-[15px] text-muted">{s.address}</p>}
          </div>
        </div>
      </div>
      <div className="container-x overflow-hidden pb-6">
        <p aria-hidden className="font-display select-none whitespace-nowrap text-[12vw] leading-[0.85] tracking-[-0.04em] opacity-90 md:text-[11vw]">{s.name}</p>
        <div className="mt-6 flex flex-col gap-2 text-[14px] text-muted sm:flex-row sm:justify-between">
          <span>© {year} {s.name}. {settings.commerce.taxNote}.</span>
          {s.gstin && <span>GSTIN {s.gstin}</span>}
        </div>
      </div>
    </footer>
  );
}
