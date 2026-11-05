/** Keyword-researched SEO copy for the starter catalogue. Applied by the seed ONLY to empty fields, so edits made in admin are never overwritten.
 *  Target terms (India): scented candles, luxury scented candles, soy wax candles, handmade candles, jar candles, pillar candles,
 *  candle gift set, candle gift hamper, Diwali candle gift box, personalised / customised candles, wedding return gifts, birthday gift candles,
 *  aromatherapy candles, home fragrance, sandalwood / oud / jasmine / rose scented candles. */

export const CATEGORY_SEO: Record<string, { name?: string; description: string; seoTitle: string; seoDescription: string; content: string }> = {
  candles: {
    description: "Luxury scented jar candles, hand-poured in natural soy wax with lead-free cotton wicks. Choose your scent, wax colour and label.",
    seoTitle: "Scented Jar Candles – Luxury Soy Wax Candles Online India",
    seoDescription: "Buy luxury scented jar candles online in India. Hand-poured soy wax candles in oud, sandalwood, jasmine, rose & petrichor, with a personalised label.",
    content: `Our scented jar candles are poured by hand in small batches from **100% natural soy wax**, with lead-free cotton wicks and phthalate-free fragrance oils. Soy wax burns cleaner and slower than paraffin, so a 200 g candle gives you around 40 hours of even, sooty-free light, and the 350 g size around 70 hours.

## Choose your scent
- **Oud & Amber** — warm, resinous and smoky; a luxury candle for long evenings
- **Sandalwood** — creamy Mysore sandalwood with soft musk, lovely for puja and meditation
- **Night Jasmine** — mogra and white tea; a fresh floral aromatherapy candle
- **Rose & Saffron** — damask rose warmed with kesar; a romantic gift
- **Monsoon Petrichor** — vetiver and wet earth, the smell of the first rain

Every jar can be poured in the wax colour you pick and labelled with a name or message, which makes these some of the most loved **personalised candles** and **gift candles** we make. Once the candle is finished, the amber apothecary jar can be washed and reused.`,
  },
  pillars: {
    name: "Pillar & sculpted candles",
    description: "Hand-poured pillar candles and sculpted bubble candles in soy wax — beautiful lit or unlit.",
    seoTitle: "Pillar Candles & Sculpted Bubble Candles Online | Archaic",
    seoDescription: "Shop hand-poured pillar candles and sculpted bubble candles in India. Unscented or scented soy wax candles for home décor, dining tables and festive styling.",
    content: `Pillar candles bring warm, steady light to a dining table, a mantel or a puja corner. Ours are poured in a **soy and coconut wax blend** that stands on its own without a jar, in ivory, charcoal and sage. Choose them **unscented** for dinners and events, or scented in our signature fragrances.

Our **sculpted bubble candles** are poured in silicone moulds and finished by hand. They are as much home décor as they are candles, and make a popular small gift and wedding return gift.`,
  },
  "gift-sets": {
    name: "Candle gift sets & hampers",
    description: "Candle gift sets and hampers, wrapped by hand with a card — for Diwali, weddings, birthdays and corporate gifting.",
    seoTitle: "Candle Gift Sets & Hampers – Diwali, Wedding & Birthday",
    seoDescription: "Scented candle gift sets & hampers online in India: Diwali candle gift boxes, wedding hampers, birthday and self-care gifts, wrapped with a handwritten card.",
    content: `A scented candle is one of the easiest gifts to get right, and our **candle gift sets** are made to be given. Every box is wrapped by hand and comes with a card carrying your message.

## Gifts for every occasion
- **Diwali gift box** — three scented candles and long matches; a festive gift for family, friends and clients
- **Wedding hampers** — labels printed with the couple's names; also loved as **wedding return gifts**
- **Birthday candle box** — their favourite scent with a birthday label
- **Self-care gift set** — a lavender candle, a bubble candle and a wick trimmer for a slow evening

Ordering for an event or **corporate Diwali gifting**? Write to us for bulk and custom-label orders.`,
  },
  accessories: {
    name: "Candle accessories",
    description: "Wick trimmers, long matches and everything for a cleaner, longer candle burn.",
    seoTitle: "Candle Accessories – Wick Trimmers & Long Matches | Archaic",
    seoDescription: "Candle care accessories: brass wick trimmers and long safety matches. Help your scented candles burn cleaner, safer and longer.",
    content: `A trimmed wick is the secret to a clean, soot-free burn. Trim it to 5 mm before every burn with a **brass wick trimmer**, and light deep jars safely with **long matches**. Both make thoughtful add-ons to a candle gift.`,
  },
};

export const PRODUCT_SEO: Record<string, { seoTitle: string; seoDescription: string; tags: string[] }> = {
  "oud-amber": { seoTitle: "Oud & Amber Scented Candle – Luxury Soy Wax Jar Candle", seoDescription: "Luxury oud and amber scented candle, hand-poured in soy wax. Resin, smoke and honey notes, 40–70 hour burn. Choose wax colour and personalise the label.", tags: ["oud candle", "amber candle", "luxury scented candle", "soy wax candle", "jar candle", "personalised candle"] },
  monsoon: { seoTitle: "Monsoon Petrichor Scented Candle – Vetiver Soy Candle", seoDescription: "Petrichor scented candle that smells like the first rain: vetiver and wet earth in hand-poured soy wax. A fresh, grounding candle for home.", tags: ["petrichor candle", "vetiver candle", "rain scented candle", "soy wax candle", "jar candle"] },
  sandalwood: { seoTitle: "Sandalwood Scented Candle – Mysore Sandal Soy Candle", seoDescription: "Creamy Mysore sandalwood scented candle with soft musk, hand-poured in natural soy wax. Ideal for puja, meditation and calm evenings.", tags: ["sandalwood candle", "chandan candle", "puja candle", "meditation candle", "soy wax candle"] },
  "rose-saffron": { seoTitle: "Rose & Saffron Scented Candle – Romantic Gift Candle", seoDescription: "Damask rose and saffron scented candle in soy wax. A romantic gift candle for anniversaries and Valentine's Day. Add a personalised label.", tags: ["rose candle", "saffron candle", "romantic candle", "anniversary gift", "gift candle"] },
  jasmine: { seoTitle: "Jasmine Scented Candle – Mogra & White Tea Soy Candle", seoDescription: "Night jasmine (mogra) scented candle with white tea, hand-poured in soy wax. A light, floral aromatherapy candle for bedrooms and baths.", tags: ["jasmine candle", "mogra candle", "floral candle", "aromatherapy candle", "soy wax candle"] },
  "pillar-trio": { seoTitle: "Pillar Candle Set of 3 – Unscented & Scented Pillar Candles", seoDescription: "Set of three hand-poured pillar candles in graded heights. Unscented or scented, in ivory, charcoal or sage. Perfect for dining tables and festive décor.", tags: ["pillar candles", "candle set", "unscented candles", "decor candles", "dining table candles"] },
  "bubble-candle": { seoTitle: "Bubble Candle – Sculpted Aesthetic Soy Candle", seoDescription: "Sculpted bubble cube candle, hand-finished in soy wax. An aesthetic décor candle and a popular small gift and return gift.", tags: ["bubble candle", "aesthetic candle", "decor candle", "return gift", "sculpted candle"] },
  "diwali-gift-box": { seoTitle: "Diwali Candle Gift Box – Set of 3 Scented Candles", seoDescription: "Diwali gift box with three scented soy candles you choose, long matches and a handwritten card. A festive candle gift hamper for family and corporate gifting.", tags: ["diwali gift", "diwali candles", "candle gift box", "corporate diwali gift", "festive hamper"] },
  "slow-evening-set": { seoTitle: "Self-care Candle Gift Set – Lavender Candle Hamper", seoDescription: "Self-care gift set: lavender scented candle, sculpted bubble candle and a brass wick trimmer, boxed in sage. A thoughtful gift for her, him or yourself.", tags: ["self care gift", "lavender candle", "candle gift set", "gift for her", "relaxation gift"] },
  "wedding-hamper": { seoTitle: "Wedding Candle Hamper – Personalised Wedding Gift", seoDescription: "Wedding gift hamper with two 350 g scented candles and a pillar trio, labels printed with the couple's names. A personalised wedding and anniversary gift.", tags: ["wedding gift", "wedding hamper", "personalised wedding gift", "anniversary gift", "wedding return gifts"] },
  "birthday-box": { seoTitle: "Birthday Candle Gift Box – Personalised Birthday Gift", seoDescription: "A scented candle in their favourite fragrance with a birthday label, wrapped in rose paper with a card. A personalised birthday gift, shipped across India.", tags: ["birthday gift", "birthday candle gift", "personalised gift", "gift for her", "candle gift"] },
  "brass-wick-trimmer": { seoTitle: "Brass Wick Trimmer – Candle Care Tool", seoDescription: "Solid brass candle wick trimmer with an angled head for deep jars. Keeps scented candles burning clean, even and soot-free.", tags: ["wick trimmer", "candle care", "candle accessories"] },
  "long-matches": { seoTitle: "Long Safety Matches for Candles – 50 Matches", seoDescription: "Fifty extra-long 10 cm safety matches in a reusable box. Light deep jar candles and diyas safely.", tags: ["long matches", "candle matches", "candle accessories"] },
};

export const PAGE_SEO: Record<string, string> = {
  faq: `## How long does a scented candle burn?
Our 200 g jar candles burn for about 40 hours and the 350 g size for about 70 hours, when the wick is trimmed to 5 mm before each burn.

## Why soy wax candles?
Soy wax is plant-based, burns cleaner and slower than paraffin, and holds fragrance well. All our candles use natural soy wax and lead-free cotton wicks.

## Can I personalise a candle?
Yes. Most jar candles and gift sets let you add a name or message to the label, and choose the scent, wax colour and label theme on the product page.

## Do you make wedding return gifts and corporate Diwali gifts?
Yes. Write to us with the quantity and date — we make bulk orders with custom labels for weddings, baby showers, birthdays and corporate gifting.

## How should I burn my candle the first time?
Let it burn for 2–3 hours until the melted wax reaches the edge of the jar. This prevents tunnelling and gives you the full burn time.

## Do you ship across India?
Yes, we ship scented candles and gift hampers to every pincode we can reach in India. Orders are dispatched within 2 working days, with free shipping above ₹999.`,
};
