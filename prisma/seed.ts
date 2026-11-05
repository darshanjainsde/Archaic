/* Seeds settings, categories, sample products, pages, a coupon and the first admin.
   Safe to re-run: existing rows are left alone (upserts by unique keys). */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_SETTINGS } from "../src/lib/settings-schema";

const db = new PrismaClient();
const img = (f: string) => `/images/products/${f}.svg`;
const r = (rupees: number) => rupees * 100;

// [id, label, wax tint for the candle button, short note under the name]
const SCENTS = [
  ["oud", "Oud & Amber", "#d9a35a", "resin · honey"], ["sandal", "Sandalwood", "#e9dcc3", "creamy · musk"], ["vanilla", "Vanilla Bean", "#f1e3c2", "warm · sweet"], ["lavender", "Lavender Fields", "#c9b8d9", "fields · linen"], ["jasmine", "Night Jasmine", "#f1ecdf", "mogra · white tea"], ["petrichor", "Monsoon Petrichor", "#8fa98a", "vetiver · wet earth"], ["rose", "Rose & Saffron", "#e7b7b0", "damask · kesar"],
] as const;

function scentGroup(defaultFirst?: string) {
  const list = defaultFirst ? [...SCENTS].sort((a) => (a[0] === defaultFirst ? -1 : 1)) : SCENTS;
  return { id: "scent", name: "Scent", display: "candle", required: true, values: list.map(([id, label, hex, note]) => ({ id, label, hex, note, priceDelta: id === "oud" ? r(100) : 0, image: null, available: true })) };
}
function colourGroup(slug: string) {
  const c: [string, string, string][] = [["ivory", "Ivory", "#efe6d2"], ["amber", "Amber", "#d9a05b"], ["walnut", "Walnut", "#7a5634"], ["sage", "Sage", "#a9b59a"], ["rose", "Rose clay", "#d9a6a0"]];
  return { id: "colour", name: "Wax colour", display: "swatch", required: true, values: c.map(([id, label, hex]) => ({ id, label, hex, priceDelta: 0, image: img(`${slug}-${id}`), available: true })) };
}
const themeGroup = { id: "theme", name: "Label theme", display: "dropdown", required: true, values: [
  { id: "classic", label: "Classic apothecary", hex: null, priceDelta: 0, image: null, available: true },
  { id: "festive", label: "Festive (Diwali)", hex: null, priceDelta: 0, image: null, available: true },
  { id: "birthday", label: "Birthday", hex: null, priceDelta: 0, image: null, available: true },
  { id: "anniversary", label: "Anniversary", hex: null, priceDelta: 0, image: null, available: true },
  { id: "wedding", label: "Wedding favour", hex: null, priceDelta: r(50), image: null, available: true },
] };
const sizeGroup = { id: "size", name: "Size", display: "button", required: true, values: [
  { id: "200", label: "200 g · 40 hrs", hex: null, priceDelta: 0, image: null, available: true },
  { id: "350", label: "350 g · 70 hrs", hex: null, priceDelta: r(500), image: null, available: true },
] };
const personal = { enabled: true, label: "Name or message on the label", maxLength: 30, price: r(99), required: false };
const jarSpecs = [
  { label: "Wax", value: "100% soy wax" }, { label: "Wick", value: "Lead-free cotton" }, { label: "Vessel", value: "Amber apothecary glass, reusable" }, { label: "Burn time", value: "40–70 hours" }, { label: "Made in", value: "India, by hand" },
];
const care = `\n\n## Candle care\n- Burn for 2–3 hours the first time, until the top melts edge to edge.\n- Trim the wick to 5 mm before every burn.\n- Never leave a burning candle unattended.`;

const JARS = [
  { slug: "oud-amber", name: "Oud & Amber Apothecary Jar", scent: "oud", price: 1299, compare: 1499, featured: true, badge: "Bestseller", short: "Resin, smoke and warm honey. Our first pour, and still the most loved.", desc: "A slow, resinous candle for long evenings. **Agarwood oud** meets **amber** and a thread of honey, poured into an amber apothecary jar and finished with a label you choose." },
  { slug: "monsoon", name: "Monsoon Petrichor Jar", scent: "petrichor", price: 1199, compare: null, featured: true, badge: "New", short: "The smell of the first rain on hot earth.", desc: "Built around **vetiver** and wet clay, this is the smell of the first monsoon shower on a terrace. Fresh, green and grounding." },
  { slug: "sandalwood", name: "Sandalwood Temple Jar", scent: "sandal", price: 1249, compare: 1399, featured: true, badge: null, short: "Creamy Mysore sandalwood with soft musk.", desc: "A quiet, creamy sandalwood with a little musk. The candle for a morning puja or a slow Sunday." },
  { slug: "rose-saffron", name: "Rose & Saffron Jar", scent: "rose", price: 1349, compare: null, featured: true, badge: null, short: "Damask rose warmed with kesar.", desc: "Damask rose softened with **saffron** and a little cardamom. Romantic, warm and made for gifting." },
  { slug: "jasmine", name: "Night Jasmine Jar", scent: "jasmine", price: 1199, compare: null, featured: false, badge: null, short: "Mogra in full bloom, with white tea.", desc: "The scent of a mogra garland at dusk, lifted with white tea. Light, floral and clean." },
];

async function main() {
  await db.setting.upsert({ where: { id: "store" }, create: { id: "store", data: DEFAULT_SETTINGS as object }, update: {} });
  await upgradeSettings();
  await db.orderCounter.upsert({ where: { id: "orders" }, create: { id: "orders", value: 10000 }, update: {} });

  const email = (process.env.ADMIN_EMAIL || "admin@archaiccandles.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) throw new Error("Set ADMIN_PASSWORD (8+ chars) before seeding");
  await db.user.upsert({ where: { email }, create: { email, name: "Archaic Admin", passwordHash: await bcrypt.hash(password, 11), role: "ADMIN" }, update: { role: "ADMIN" } });

  const cats = [
    { slug: "candles", name: "Scented jar candles", description: "Hand-poured soy wax scented candles in reusable apothecary jars. Oud, sandalwood, rose, jasmine and monsoon petrichor, 40+ hour burn.", image: img("oud-amber-amber"), sortOrder: 1 },
    { slug: "pillars", name: "Pillar & sculpted candles", description: "Unscented and scented pillar candles and sculpted decor candles for your table, puja room, Diwali and weddings.", image: img("pillar-trio-ivory"), sortOrder: 2 },
    { slug: "gift-sets", name: "Candle gift sets", description: "Candle gift boxes and hampers, wrapped by hand with a personal note. For Diwali, weddings, birthdays, housewarmings and corporate gifting.", image: img("box-diwali"), sortOrder: 3 },
    { slug: "accessories", name: "Candle accessories", description: "Wick trimmers, snuffers, matches and care tools for a cleaner, longer and safer candle burn.", image: img("trimmer"), sortOrder: 4 },
  ];
  const catIds: Record<string, string> = {};
  for (const c of cats) catIds[c.slug] = (await db.category.upsert({ where: { slug: c.slug }, create: c, update: {} })).id;

  // Sub-categories (two levels only). Upserted by slug; a later admin edit is never overwritten.
  const subs = [
    { parent: "gift-sets", slug: "diwali-gifts", name: "Diwali gifts", image: img("box-diwali"), sortOrder: 1 },
    { parent: "gift-sets", slug: "wedding-favours", name: "Wedding favours", image: img("box-wedding"), sortOrder: 2 },
    { parent: "gift-sets", slug: "birthday-gifts", name: "Birthday", image: img("box-birthday"), sortOrder: 3 },
    { parent: "gift-sets", slug: "housewarming", name: "Housewarming", image: img("box-selfcare"), sortOrder: 4 },
    { parent: "gift-sets", slug: "corporate-gifting", name: "Corporate gifting", image: img("matches"), sortOrder: 5 },
    { parent: "candles", slug: "oud-woody", name: "Oud & woody", image: img("oud-amber-amber"), sortOrder: 1 },
    { parent: "candles", slug: "floral", name: "Floral", image: img("rose-saffron-rose"), sortOrder: 2 },
    { parent: "candles", slug: "fresh-green", name: "Fresh & green", image: img("monsoon-sage"), sortOrder: 3 },
  ];
  for (const c of subs) {
    const parentId = catIds[c.parent];
    catIds[c.slug] = (await db.category.upsert({ where: { slug: c.slug }, create: { slug: c.slug, name: c.name, image: c.image, sortOrder: c.sortOrder, parentId }, update: {} })).id;
  }

  type P = { slug: string; name: string; cat: string; price: number; compare?: number | null; stock: number; featured?: boolean; badge?: string | null; short: string; desc: string; images: string[]; options: unknown[]; specs?: unknown[]; personalization?: unknown; tags?: string[] };
  const products: P[] = [
    ...JARS.map((j) => ({ slug: j.slug, name: j.name, cat: "candles", price: r(j.price), compare: j.compare ? r(j.compare) : null, stock: 40, featured: j.featured, badge: j.badge, short: j.short, desc: j.desc + care, images: [img(`${j.slug}-amber`), img(`${j.slug}-ivory`), img(`${j.slug}-lid`)], options: [scentGroup(j.scent), colourGroup(j.slug), themeGroup, sizeGroup], specs: jarSpecs, personalization: personal, tags: ["jar", "soy"] })),
    { slug: "pillar-trio", name: "Pillar Candle Trio", cat: "pillars", price: r(1599), compare: r(1899), stock: 25, featured: true, short: "Three unscented or scented pillars in graded heights.", desc: "A set of three hand-poured pillars, 7, 10 and 15 cm tall. Beautiful on a tray, a mantel or a dining table." + care, images: [img("pillar-trio-ivory"), img("pillar-trio-charcoal"), img("pillar-trio-sage")], options: [
      { id: "colour", name: "Colour", display: "swatch", required: true, values: [["ivory", "Ivory", "#efe6d2"], ["charcoal", "Charcoal", "#3b3633"], ["sage", "Sage", "#a9b59a"]].map(([id, label, hex]) => ({ id, label, hex, priceDelta: 0, image: img(`pillar-trio-${id}`), available: true })) },
      { id: "scent", name: "Scent", display: "dropdown", required: true, values: [{ id: "none", label: "Unscented", hex: null, priceDelta: 0, image: null, available: true }, ...SCENTS.slice(0, 4).map(([id, label]) => ({ id, label, hex: null, priceDelta: r(150), image: null, available: true }))] },
    ], specs: [{ label: "Heights", value: "7, 10 and 15 cm" }, { label: "Wax", value: "Soy & coconut blend" }] },
    { slug: "bubble-candle", name: "Sculpted Bubble Candle", cat: "pillars", price: r(699), stock: 60, badge: "Gift pick", short: "The nine-bubble cube that looks good unlit too.", desc: "Our sculpted bubble cube is poured in a silicone mould and finished by hand. Lovely as decor; burns for about 12 hours.", images: [img("bubble-ivory"), img("bubble-rose"), img("bubble-sage")], options: [
      { id: "colour", name: "Colour", display: "swatch", required: true, values: [["ivory", "Ivory", "#efe6d2"], ["rose", "Rose clay", "#d9a6a0"], ["sage", "Sage", "#a9b59a"]].map(([id, label, hex]) => ({ id, label, hex, priceDelta: 0, image: img(`bubble-${id}`), available: true })) },
    ], specs: [{ label: "Size", value: "6 × 6 × 6 cm" }, { label: "Burn time", value: "About 12 hours" }] },
    { slug: "diwali-gift-box", name: "Diwali Gift Box", cat: "gift-sets", price: r(2499), compare: r(2899), stock: 30, featured: true, badge: "Festive", short: "Three mini jars, long matches and a handwritten card.", desc: "A festive box of three 100 g jars in scents you choose, a box of long matches and a handwritten card.\n\n- 3 × 100 g apothecary jars\n- Long safety matches\n- Handwritten card with your message", images: [img("box-diwali"), img("oud-amber-amber"), img("matches")], options: [
      { ...scentGroup("oud"), id: "scent1", name: "First scent" }, { ...scentGroup("sandal"), id: "scent2", name: "Second scent" }, { ...scentGroup("rose"), id: "scent3", name: "Third scent" },
    ], personalization: { enabled: true, label: "Message for the card", maxLength: 160, price: 0, required: false } },
    { slug: "slow-evening-set", name: "Slow Evening Self-care Set", cat: "gift-sets", price: r(1899), stock: 20, short: "A lavender jar, a bubble candle and a wick trimmer.", desc: "Everything for an evening off: a Lavender Fields jar, a sculpted bubble candle and a brass wick trimmer, boxed in sage.", images: [img("box-selfcare"), img("bubble-sage"), img("trimmer")], options: [], personalization: { enabled: true, label: "Message for the card", maxLength: 160, price: 0, required: false } },
    { slug: "wedding-hamper", name: "Shubh Vivah Wedding Hamper", cat: "gift-sets", price: r(3999), stock: 10, badge: "Made to order", short: "For the couple: two 350 g jars and a pillar trio.", desc: "A generous hamper for a wedding or anniversary. Labels printed with the couple's names.\n\nMade to order; dispatched in 4–5 days.", images: [img("box-wedding"), img("rose-saffron-rose"), img("pillar-trio-ivory")], options: [{ ...themeGroup, values: themeGroup.values.filter((v) => ["wedding", "anniversary", "classic"].includes(v.id)) }], personalization: { enabled: true, label: "Names of the couple", maxLength: 40, price: 0, required: true } },
    { slug: "birthday-box", name: "Birthday Candle Box", cat: "gift-sets", price: r(1499), stock: 25, short: "One jar in their favourite scent, wrapped for a birthday.", desc: "A single 200 g jar with a birthday label, wrapped in rose paper with a card.", images: [img("box-birthday"), img("jasmine-rose")], options: [scentGroup("vanilla")], personalization: { enabled: true, label: "Birthday message", maxLength: 120, price: 0, required: false } },
    { slug: "brass-wick-trimmer", name: "Brass Wick Trimmer", cat: "accessories", price: r(549), stock: 50, short: "Trims wicks to the right length for a clean flame.", desc: "Solid brass trimmer with an angled head that reaches into deep jars.", images: [img("trimmer")], options: [] },
    { slug: "long-matches", name: "Long Safety Matches", cat: "accessories", price: r(199), stock: 100, short: "Extra-long matches in a reusable box.", desc: "Fifty 10 cm matches in a reusable printed box. Reach deep jars without burnt fingers.", images: [img("matches")], options: [] },
  ];

  let sort = 0;
  for (const p of products) {
    const exists = await db.product.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    await db.product.create({
      data: {
        slug: p.slug, name: p.name, categoryId: catIds[p.cat], price: p.price, compareAtPrice: p.compare ?? null, stock: p.stock, status: "ACTIVE", featured: Boolean(p.featured), badge: p.badge ?? null,
        shortDescription: p.short, description: p.desc, options: p.options as object, specs: (p.specs ?? []) as object, personalization: (p.personalization ?? undefined) as object | undefined, tags: p.tags ?? [], sortOrder: sort++,
        images: { create: p.images.map((url, i) => ({ url, alt: p.name, sortOrder: i })) },
      },
    });
  }

  // Put the sample products into their sub-categories, but only while they still sit in the parent (never undo an admin move).
  const placement: Record<string, [string, string]> = {
    "diwali-gift-box": ["gift-sets", "diwali-gifts"], "wedding-hamper": ["gift-sets", "wedding-favours"], "birthday-box": ["gift-sets", "birthday-gifts"], "slow-evening-set": ["gift-sets", "housewarming"],
    "oud-amber": ["candles", "oud-woody"], sandalwood: ["candles", "oud-woody"], "rose-saffron": ["candles", "floral"], jasmine: ["candles", "floral"], monsoon: ["candles", "fresh-green"],
  };
  for (const [slug, [from, to]] of Object.entries(placement)) {
    await db.product.updateMany({ where: { slug, categoryId: catIds[from] }, data: { categoryId: catIds[to] } });
  }

  const pages = [
    { slug: "about", title: "Our story", content: "Archaic Candles began at a kitchen table, with a double boiler and a jar of soy flakes.\n\nWe pour every candle by hand in small batches, blend our own fragrance oils, and write each label for the person who will light it.\n\n## What we use\n- 100% soy wax and lead-free cotton wicks\n- Phthalate-free fragrance and essential oils\n- Reusable amber glass jars" },
    { slug: "shipping-policy", title: "Shipping policy", content: "We dispatch orders within 2 working days. Delivery across India usually takes 3–7 working days after dispatch.\n\n- Free shipping on orders above ₹999\n- A flat ₹79 shipping fee applies below that\n- You will receive a tracking number by email when your order ships" },
    { slug: "returns", title: "Returns & refunds", content: "Because candles are personal and often personalised, we do not accept returns of used or personalised items.\n\nIf your order arrives damaged, write to us within 48 hours of delivery with a photo and we will replace it or refund you in full.\n\nRefunds for cancelled prepaid orders are made to the original payment method within 5–7 working days." },
    { slug: "privacy-policy", title: "Privacy policy", content: "We collect only what we need to fulfil your order: your name, contact details and delivery address. Payments are processed by our payment partners (Razorpay / Cashfree); we never see or store your card details.\n\nWe do not sell your data. You can ask us to delete your account at any time by writing to us." },
    { slug: "terms", title: "Terms & conditions", content: "By placing an order you agree to these terms. Prices are in Indian Rupees and include applicable taxes. We may cancel an order if an item is out of stock, in which case any payment is refunded in full.\n\nNever leave a burning candle unattended. Keep away from children, pets and anything flammable." },
    { slug: "contact", title: "Contact us", content: "Write to us at hello@archaiccandles.com. We reply within one working day.\n\nFor order questions, please include your order number (it starts with AC)." },
  ];
  for (const pg of pages) await db.page.upsert({ where: { slug: pg.slug }, create: pg, update: {} });

  await db.coupon.upsert({ where: { code: "WELCOME10" }, create: { code: "WELCOME10", description: "10% off your first order", type: "PERCENT", value: 10, minOrder: r(799), maxDiscount: r(300), perUserLimit: 1 }, update: {} });
  await db.banner.deleteMany({ where: { title: "__never__" } });
  if ((await db.banner.count()) === 0) {
    await db.banner.createMany({ data: [
      { placement: "HERO", title: "Choose your scent. We pour it.", subtitle: "Every jar is poured to order in the scent, colour and label you pick.", ctaLabel: "Start with Oud & Amber", ctaHref: "/product/oud-amber", image: img("oud-amber-amber"), sortOrder: 0 },
      { placement: "PROMO", title: "The Diwali box is back", subtitle: "Three pours, long matches and a handwritten card. Save ₹400 until the festival.", ctaLabel: "See the box", ctaHref: "/product/diwali-gift-box", image: img("box-diwali"), bgColor: "#6e2b22", textColor: "#f4ecdd", sortOrder: 0 },
    ] });
  }
  console.log("Seed complete. Admin:", email);
}

/** Brings stored settings up to date with sections added since they were saved. Only fills what is missing. */
async function upgradeSettings() {
  const row = await db.setting.findUnique({ where: { id: "store" } });
  const data = row?.data as { home?: { sections?: Record<string, unknown>[] } } | null;
  const list = data?.home?.sections;
  if (!data || !Array.isArray(list)) return;
  let changed = false;
  if (!list.some((s) => s.type === "occasions")) {
    const def = DEFAULT_SETTINGS.home.sections.find((s) => s.type === "occasions")!;
    const at = list.findIndex((s) => s.type === "usp");
    list.splice(at >= 0 ? at + 1 : Math.min(1, list.length), 0, { ...def });
    changed = true;
  }
  for (const s of list) {
    // sections saved before the hero product existed have no key at all; an empty string is the admin's own choice
    if (s.type === "hero" && !("productSlug" in s)) { s.productSlug = "oud-amber"; s.buyNow = true; s.pour = true; changed = true; }
  }
  // header links saved before dropdown menus existed: give the shop links their menu (only where the key is missing)
  const nav = (data as { nav?: Record<string, unknown>[] }).nav;
  if (Array.isArray(nav)) {
    for (const l of nav) {
      if ("menu" in l || typeof l.href !== "string") continue;
      const m = /^\/shop\?category=([\w-]+)$/.exec(l.href);
      if (l.href === "/shop") { l.menu = "all"; l.categorySlug = ""; changed = true; }
      else if (m) { l.menu = "category"; l.categorySlug = m[1]; changed = true; }
    }
  }
  if (changed) await db.setting.update({ where: { id: "store" }, data: { data: data as object } });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
