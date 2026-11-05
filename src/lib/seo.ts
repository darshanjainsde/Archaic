import type { StoreSettings } from "./settings-schema";
import { siteUrl } from "./utils";

/** Serialise JSON-LD safely for a <script> tag. */
export function ldJson(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export const abs = (url: string) => (url.startsWith("http") ? url : siteUrl(url.startsWith("/") ? url : `/${url}`));

/** Social platforms can't render SVG previews; fall back to the generated card. */
export function socialImage(url: string | null | undefined, title?: string) {
  if (url && !/\.svg(\?|$)/i.test(url)) return url;
  return title ? `/og?title=${encodeURIComponent(title.slice(0, 90))}` : "/og";
}

export function organizationLd(s: StoreSettings) {
  const sameAs = [s.store.instagram].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": siteUrl("/#organization"),
    name: s.store.name,
    url: siteUrl("/"),
    logo: s.store.logoUrl ? abs(s.store.logoUrl) : siteUrl("/icons/512"),
    description: s.seo.description,
    ...(s.store.email ? { email: s.store.email } : {}),
    ...(s.store.phone ? { telephone: s.store.phone } : {}),
    ...(s.store.address ? { address: { "@type": "PostalAddress", streetAddress: s.store.address, addressCountry: "IN" } } : {}),
    ...(s.store.gstin ? { taxID: s.store.gstin } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    areaServed: { "@type": "Country", name: "India" },
    currenciesAccepted: "INR",
    hasMerchantReturnPolicy: returnPolicyLd(s),
  };
}

export function websiteLd(s: StoreSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    name: s.store.name,
    url: siteUrl("/"),
    inLanguage: "en-IN",
    publisher: { "@id": siteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: siteUrl("/shop?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: siteUrl(it.path) })),
  };
}

export function returnPolicyLd(s: StoreSettings) {
  const c = s.commerce;
  return c.returnsEnabled
    ? {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: c.returnDays,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      }
    : { "@type": "MerchantReturnPolicy", applicableCountry: "IN", returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted" };
}

/** Shipping for one unit at `pricePaise`, using the store's flat rate / free threshold. */
export function shippingLd(s: StoreSettings, pricePaise: number) {
  const c = s.commerce;
  const free = c.freeShippingThreshold === 0 || pricePaise >= c.freeShippingThreshold;
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: free ? 0 : +(c.flatShipping / 100).toFixed(2), currency: "INR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: Math.max(1, c.dispatchDays), unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: c.deliveryDaysMin, maxValue: c.deliveryDaysMax, unitCode: "DAY" },
    },
  };
}
