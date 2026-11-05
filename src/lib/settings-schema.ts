import { z } from "zod";
import { FONT_KEYS } from "./fonts-list";

/** Store-wide configuration edited from Admin > Appearance / Settings. Pure module: safe on client & server. */

const hex = z.string().regex(/^#([0-9a-fA-F]{6})$/, "Use a 6 digit hex colour like #2b2216");

export const themeSchema = z.object({
  preset: z.string().default("beige"),
  colors: z.object({
    bg: hex, // page ground
    surface: hex, // panels, cards (one tone step from bg)
    ink: hex, // text
    muted: hex, // secondary text
    accent: hex, // buttons, the one accent
    accentInk: hex, // text on accent
    field: hex, // alternate section ground (tan field)
    fieldInk: hex, // text on field
    paper: hex, // the label / paper colour used for product cards & sheets
    paperInk: hex,
    sale: hex, // discount colour
  }),
  radius: z.number().int().min(0).max(28).default(0),
  buttonShape: z.enum(["square", "pill"]).default("square"),
  displayFont: z.enum(FONT_KEYS).default("fraunces"),
  bodyFont: z.enum(FONT_KEYS).default("manrope"),
  headingWeight: z.number().int().min(300).max(800).default(500),
  /** Page-wide scroll scene. "honeycomb": kraft honeycomb wrap that opens as you scroll, lit by a fixed candle. "calm": none. */
  motion: z.enum(["honeycomb", "calm"]).default("honeycomb"),
});
export type ThemeSettings = z.infer<typeof themeSchema>;

const sectionBase = { id: z.string().min(1), enabled: z.boolean().default(true) };

export const homeSectionSchema = z.discriminatedUnion("type", [
  z.object({
    ...sectionBase, type: z.literal("hero"), heading: z.string().default(""), text: z.string().default(""), ctaLabel: z.string().default(""), ctaHref: z.string().default(""), image: z.string().nullish(),
    /** Product shown on the hero jar with price and Buy now (slug). Empty = headline only. */
    productSlug: z.string().default(""),
    buyNow: z.boolean().default(true),
    /** The scroll-driven pour animation on the hero jar */
    pour: z.boolean().default(true),
  }),
  /** Gift tags: the sub-categories of `categorySlug` (e.g. Diwali, Wedding, Corporate under Gift sets) as photo tiles with count and starting price. */
  z.object({ ...sectionBase, type: z.literal("occasions"), heading: z.string().default("Gifts for the occasion"), text: z.string().default("Boxed, wrapped and ready to give."), categorySlug: z.string().default("gift-sets") }),
  z.object({ ...sectionBase, type: z.literal("usp"), items: z.array(z.object({ title: z.string(), text: z.string() })).max(6) }),
  z.object({ ...sectionBase, type: z.literal("categories"), heading: z.string().default("Shop by category"), text: z.string().default("") }),
  z.object({
    ...sectionBase,
    type: z.literal("products"),
    heading: z.string(),
    text: z.string().default(""),
    source: z.enum(["featured", "new", "bestsellers", "category", "sale"]),
    categorySlug: z.string().nullish(),
    limit: z.number().int().min(2).max(24).default(8),
    layout: z.enum(["grid", "carousel"]).default("carousel"),
  }),
  z.object({ ...sectionBase, type: z.literal("promo") }),
  z.object({ ...sectionBase, type: z.literal("story"), heading: z.string(), text: z.string(), image: z.string().nullish(), ctaLabel: z.string().default(""), ctaHref: z.string().default("") }),
  z.object({ ...sectionBase, type: z.literal("reviews"), heading: z.string().default("Notes from our customers") }),
  z.object({ ...sectionBase, type: z.literal("newsletter"), heading: z.string(), text: z.string().default("") }),
  z.object({ ...sectionBase, type: z.literal("richtext"), heading: z.string().default(""), body: z.string().default("") }),
  z.object({ ...sectionBase, type: z.literal("membership"), heading: z.string().default(""), text: z.string().default("") }),
]);
export type HomeSection = z.infer<typeof homeSectionSchema>;
export type HomeSectionType = HomeSection["type"];

export const tierSchema = z.object({
  name: z.string().min(1),
  minSpend: z.number().int().min(0), // paise, lifetime
  discountPct: z.number().min(0).max(50),
  perks: z.array(z.string()).default([]),
  color: hex.default("#bda38b"),
});
export type MembershipTier = z.infer<typeof tierSchema>;

export const linkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  /** Header only: open a dropdown under this link. "all" = every category; "category" = the sub-categories of `categorySlug`. */
  menu: z.enum(["none", "all", "category"]).default("none"),
  categorySlug: z.string().default(""),
});
export type NavLink = z.infer<typeof linkSchema>;

export const settingsSchema = z.object({
  store: z.object({
    name: z.string().min(1),
    tagline: z.string().default(""),
    logoUrl: z.string().nullish(),
    email: z.string().default(""),
    phone: z.string().default(""),
    whatsapp: z.string().default(""),
    address: z.string().default(""),
    gstin: z.string().default(""),
    instagram: z.string().default(""),
    facebook: z.string().default(""),
    youtube: z.string().default(""),
    pinterest: z.string().default(""),
    x: z.string().default(""),
    mapsUrl: z.string().default(""),
  }),
  theme: themeSchema,
  announcement: z.object({
    enabled: z.boolean().default(true),
    messages: z.array(z.string()).default([]),
    href: z.string().default(""),
  }),
  nav: z.array(linkSchema).default([]),
  home: z.object({ sections: z.array(homeSectionSchema) }),
  footer: z.object({ about: z.string().default(""), links: z.array(linkSchema).default([]) }),
  commerce: z.object({
    freeShippingThreshold: z.number().int().min(0), // paise; 0 = always free
    flatShipping: z.number().int().min(0),
    giftWrapEnabled: z.boolean().default(true),
    giftWrapPrice: z.number().int().min(0),
    codEnabled: z.boolean().default(true),
    codFee: z.number().int().min(0).default(0),
    codMaxOrder: z.number().int().min(0).default(0), // 0 = no limit
    razorpayEnabled: z.boolean().default(true),
    cashfreeEnabled: z.boolean().default(true),
    preferredGateway: z.enum(["razorpay", "cashfree"]).default("cashfree"),
    returnsEnabled: z.boolean().default(false),
    returnDays: z.number().int().min(0).max(60).default(7),
    dispatchDays: z.number().int().min(0).max(30).default(2),
    deliveryDaysMin: z.number().int().min(1).max(30).default(3),
    deliveryDaysMax: z.number().int().min(1).max(45).default(7),
    lowStockThreshold: z.number().int().min(0).default(5),
    maxQtyPerLine: z.number().int().min(1).max(99).default(10),
    taxNote: z.string().default("Prices include all taxes"),
    /** Spend thresholds (paise, after discounts) that unlock a free product, added to the order at ₹0. */
    freeGifts: z.array(z.object({
      id: z.string().min(1),
      enabled: z.boolean().default(true),
      threshold: z.number().int().min(0),
      productSlug: z.string().default(""),
      label: z.string().default(""), // shown in the progress bar, e.g. "Free long matches"
    })).max(5).default([]),
    /** "Add one of these" rail in the bag and at checkout, to reach free delivery / the next gift. */
    upsell: z.object({
      enabled: z.boolean().default(true),
      heading: z.string().default("Add one of these for free delivery"),
      source: z.enum(["bestsellers", "featured", "category", "new"]).default("bestsellers"),
      categorySlug: z.string().default(""),
      limit: z.number().int().min(2).max(12).default(6),
      onCheckout: z.boolean().default(true),
    }).default({ enabled: true, heading: "Add one of these for free delivery", source: "bestsellers", categorySlug: "", limit: 6, onCheckout: true }),
  }),
  membership: z.object({
    enabled: z.boolean().default(true),
    name: z.string().default("The Archaic Circle"),
    tiers: z.array(tierSchema).min(1),
  }),
  seo: z.object({ title: z.string(), description: z.string(), ogImage: z.string().nullish() }),
});
export type StoreSettings = z.infer<typeof settingsSchema>;

export const THEME_PRESETS: Record<string, { label: string; theme: Omit<ThemeSettings, "preset" | "motion"> }> = {
  beige: {
    label: "Linen Beige",
    theme: {
      // contrast: ink on bg 13.3:1 · muted on bg 6.1:1 · accentInk on accent 13.9:1 · sale on bg 4.6:1
      colors: { bg: "#f1e8d9", surface: "#e8dcc8", ink: "#2b2216", muted: "#6a5944", accent: "#2b2216", accentInk: "#f6eee1", field: "#2b2216", fieldInk: "#f1e8d9", paper: "#fffaf1", paperInk: "#2b2216", sale: "#a85a1f" },
      radius: 0, buttonShape: "square", displayFont: "fraunces", bodyFont: "manrope", headingWeight: 500,
    },
  },
  walnut: {
    label: "Walnut & Tan",
    theme: {
      colors: { bg: "#2b2216", surface: "#382d1e", ink: "#ece6da", muted: "#b3a998", accent: "#bda38b", accentInk: "#1c150d", field: "#bda38b", fieldInk: "#1c150d", paper: "#efe7d8", paperInk: "#2b2216", sale: "#e0a46a" },
      radius: 0, buttonShape: "square", displayFont: "fraunces", bodyFont: "manrope", headingWeight: 500,
    },
  },
  linen: {
    label: "Linen & Ember",
    theme: {
      colors: { bg: "#f4efe6", surface: "#ebe3d5", ink: "#24190f", muted: "#6b5d4c", accent: "#24190f", accentInk: "#f4efe6", field: "#2b2216", fieldInk: "#efe7d8", paper: "#fffaf1", paperInk: "#24190f", sale: "#a4472b" },
      radius: 0, buttonShape: "square", displayFont: "fraunces", bodyFont: "manrope", headingWeight: 500,
    },
  },
  sage: {
    label: "Sage Apothecary",
    theme: {
      colors: { bg: "#e9ebe2", surface: "#dde1d3", ink: "#1f2a22", muted: "#56635a", accent: "#2f4a3a", accentInk: "#eef1e8", field: "#2f4a3a", fieldInk: "#eef1e8", paper: "#f6f6ef", paperInk: "#1f2a22", sale: "#9c4a2f" },
      radius: 4, buttonShape: "square", displayFont: "cormorant", bodyFont: "dmsans", headingWeight: 600,
    },
  },
  midnight: {
    label: "Midnight Oud",
    theme: {
      colors: { bg: "#14161c", surface: "#1e2129", ink: "#ece8df", muted: "#a5a093", accent: "#d8b36a", accentInk: "#14161c", field: "#d8b36a", fieldInk: "#14161c", paper: "#f2ede2", paperInk: "#14161c", sale: "#e5866a" },
      radius: 2, buttonShape: "square", displayFont: "playfair", bodyFont: "inter", headingWeight: 500,
    },
  },
  rose: {
    label: "Rose Clay",
    theme: {
      colors: { bg: "#f3e6e0", surface: "#ead7cf", ink: "#3a1f1a", muted: "#7a5a52", accent: "#7d3b2f", accentInk: "#fbf1ec", field: "#7d3b2f", fieldInk: "#fbf1ec", paper: "#fff8f4", paperInk: "#3a1f1a", sale: "#b0392b" },
      radius: 999, buttonShape: "pill", displayFont: "lora", bodyFont: "jost", headingWeight: 500,
    },
  },
};

export const DEFAULT_SETTINGS: StoreSettings = {
  store: {
    name: "Archaic Candles",
    tagline: "Hand-poured candles & gifts, made slowly",
    logoUrl: null,
    email: "hello@archaiccandles.com",
    phone: "",
    whatsapp: "",
    address: "India",
    gstin: "",
    instagram: "https://instagram.com/archaiccandles",
    facebook: "",
    youtube: "",
    pinterest: "",
    x: "",
    mapsUrl: "",
  },
  theme: { preset: "beige", motion: "honeycomb", ...THEME_PRESETS.beige.theme },
  announcement: {
    enabled: true,
    messages: ["Free shipping on orders above ₹999", "Gift wrapping with a handwritten note on every order"],
    href: "/shop",
  },
  nav: [
    { label: "Shop", href: "/shop", menu: "all", categorySlug: "" },
    { label: "Candles", href: "/shop?category=candles", menu: "category", categorySlug: "candles" },
    { label: "Gifting", href: "/shop?category=gift-sets", menu: "category", categorySlug: "gift-sets" },
    { label: "Our story", href: "/pages/about", menu: "none", categorySlug: "" },
    { label: "Track order", href: "/track", menu: "none", categorySlug: "" },
  ],
  home: {
    sections: [
      { id: "hero", type: "hero", enabled: true, heading: "Choose your scent. We pour it.", text: "Scented soy candles in reusable apothecary jars, labelled for the person who will light them. Gift-wrapped by hand and shipped across India.", ctaLabel: "Shop the candles", ctaHref: "/shop", image: null, productSlug: "oud-amber", buyNow: true, pour: true },
      { id: "usp", type: "usp", enabled: true, items: [
        { title: "Hand-poured soy wax", text: "Clean-burning, poured in batches of forty." },
        { title: "Choose your scent", text: "Every candle can be poured in the scent and colour you pick." },
        { title: "Gift-ready", text: "Wrapped by hand with a note in your words." },
        { title: "Ships across India", text: "Dispatched within two working days." },
      ] },
      { id: "occasions", type: "occasions", enabled: true, heading: "Gifts for the occasion", text: "Boxed, wrapped and ready to give.", categorySlug: "gift-sets" },
      { id: "cats", type: "categories", enabled: true, heading: "Shop by category", text: "" },
      { id: "featured", type: "products", enabled: true, heading: "The apothecary shelf", text: "Our most loved pours, ready to choose your scent.", source: "featured", categorySlug: null, limit: 8, layout: "carousel" },
      { id: "promo", type: "promo", enabled: true },
      { id: "gifts", type: "products", enabled: true, heading: "Gift sets", text: "Boxed, wrapped and ready to give.", source: "category", categorySlug: "gift-sets", limit: 6, layout: "grid" },
      { id: "story", type: "story", enabled: true, heading: "Why archaic", text: "Before electric light, a candle was how a house kept time. We pour ours the old way: soy wax, cotton wicks, oils blended by hand, and a label written for the person who will light it.", image: null, ctaLabel: "Read our story", ctaHref: "/pages/about" },
      { id: "membership", type: "membership", enabled: true, heading: "", text: "" },
      { id: "reviews", type: "reviews", enabled: true, heading: "Notes from our customers" },
      { id: "news", type: "newsletter", enabled: false, heading: "Letters from the workshop", text: "New scents, restocks and the occasional quiet offer. No more than twice a month." },
    ],
  },
  footer: {
    about: "Archaic Candles is a small workshop pouring soy wax candles and putting together gifts for the people you love.",
    links: [
      { label: "Track your order", href: "/track", menu: "none", categorySlug: "" },
      { label: "My account", href: "/account", menu: "none", categorySlug: "" },
    ],
  },
  commerce: {
    freeShippingThreshold: 99900,
    flatShipping: 7900,
    giftWrapEnabled: true,
    giftWrapPrice: 4900,
    codEnabled: true,
    codFee: 4900,
    codMaxOrder: 500000,
    razorpayEnabled: true,
    cashfreeEnabled: true,
    preferredGateway: "cashfree",
    returnsEnabled: false,
    returnDays: 7,
    dispatchDays: 2,
    deliveryDaysMin: 3,
    deliveryDaysMax: 7,
    lowStockThreshold: 5,
    maxQtyPerLine: 10,
    taxNote: "Prices include all taxes",
    freeGifts: [
      { id: "g1", enabled: true, threshold: 149900, productSlug: "long-matches", label: "Free long matches" },
      { id: "g2", enabled: true, threshold: 249900, productSlug: "brass-wick-trimmer", label: "Free brass wick trimmer" },
    ],
    upsell: { enabled: true, heading: "Add one of these for free delivery", source: "bestsellers", categorySlug: "", limit: 6, onCheckout: true },
  },
  membership: {
    enabled: true,
    name: "The Archaic Circle",
    tiers: [
      { name: "Wick", minSpend: 0, discountPct: 0, perks: ["Early access to new scents", "Birthday note"], color: "#b3a998" },
      { name: "Ember", minSpend: 300000, discountPct: 5, perks: ["5% off every order", "Free gift wrap"], color: "#e0a46a" },
      { name: "Flame", minSpend: 1000000, discountPct: 10, perks: ["10% off every order", "Free gift wrap", "Priority dispatch"], color: "#d8b36a" },
    ],
  },
  seo: {
    title: "Archaic Candles | Hand-poured Scented Candles & Gift Sets in India",
    description: "Shop hand-poured soy wax scented candles and candle gift sets online. Choose your scent, wax colour and label. Gift-wrapped by hand and shipped across India.",
    ogImage: null,
  },
};

/** Merge stored JSON over defaults so new fields never break old data. */
export function parseSettings(raw: unknown): StoreSettings {
  const base = structuredClone(DEFAULT_SETTINGS);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base) as (keyof StoreSettings)[]) {
    const v = r[key];
    if (v === undefined || v === null) continue;
    const b = base[key] as unknown;
    if (Array.isArray(b) || typeof b !== "object") merged[key] = v;
    else if (typeof v === "object" && !Array.isArray(v)) merged[key] = { ...(b as object), ...(v as object) };
  }
  // theme.colors needs a deep merge too
  const t = merged.theme as ThemeSettings;
  t.colors = { ...base.theme.colors, ...(t.colors ?? {}) };
  const res = settingsSchema.safeParse(merged);
  if (res.success) return res.data;
  // fall back section by section so one bad field can't take the site down
  const out = structuredClone(base);
  for (const key of Object.keys(base) as (keyof StoreSettings)[]) {
    const part = settingsSchema.shape[key].safeParse(merged[key]);
    if (part.success) (out as Record<string, unknown>)[key] = part.data;
  }
  return out;
}
