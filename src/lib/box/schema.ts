import { z } from "zod";

/**
 * Build-your-own gift box.
 *
 * `boxSettingsSchema` is the owner's catalog (Admin → Custom boxes), stored in settings.boxes.
 * `boxConfigSchema` is one customer's box as it travels in the bag and to the server.
 * Prices are paise. One "space" is a square compartment `cellCm` wide.
 */

const id = z.string().min(1).max(40);
const money = z.number().int().min(0).max(10_000_000);

/** How an item is drawn in 3D. The photo, when there is one, is used for the 2D plan and on top of flat shapes. */
export const BOX_SHAPES = ["jar", "dome", "tin", "block", "figure", "flat"] as const;
export type BoxShape = (typeof BOX_SHAPES)[number];
export const BOX_SHAPE_LABEL: Record<BoxShape, string> = {
  jar: "Jar candle",
  dome: "Glass dome",
  tin: "Round tin",
  block: "Box or bar",
  figure: "Idol or figure",
  flat: "Flat (card, bundle, cloth)",
};

/** Pattern the 3D box and the plan use for a finish when it has no photo. */
export const FINISH_PATTERNS = ["kraft", "marbled", "blockprint", "foil", "wood", "plain"] as const;

export const boxSizeSchema = z.object({
  id,
  name: z.string().min(1).max(30),
  cols: z.number().int().min(2).max(10),
  rows: z.number().int().min(2).max(10),
  price: money,
  depthCm: z.number().min(4).max(40).default(9),
  enabled: z.boolean().default(true),
});

export const decorOptionSchema = z.object({
  id,
  name: z.string().min(1).max(40),
  price: money.default(0),
  /** Hex used to draw it (ribbon, filler, wax, box colour) */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c49a62"),
  image: z.string().max(500).nullish(),
  pattern: z.enum(FINISH_PATTERNS).default("plain"),
  enabled: z.boolean().default(true),
});

export const boxDetailSchema = z.object({ label: z.string().max(30), value: z.string().max(40) });

/** An owner-made option (an idol, a sweet tin). */
export const boxOptionSchema = z.object({
  id,
  name: z.string().min(1).max(60),
  price: money,
  image: z.string().max(500).nullish(),
  w: z.number().int().min(1).max(4),
  h: z.number().int().min(1).max(4),
  heightCm: z.number().min(0.5).max(30).default(6),
  shape: z.enum(BOX_SHAPES).default("block"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c49a62"),
  details: z.array(boxDetailSchema).max(6).default([]),
  enabled: z.boolean().default(true),
});

/** Space and shape for one shop product that may go in a box. */
export const boxProductFitSchema = z.object({
  slug: z.string().min(1).max(120),
  w: z.number().int().min(1).max(4).default(1),
  h: z.number().int().min(1).max(4).default(1),
  heightCm: z.number().min(0.5).max(30).default(7),
  shape: z.enum(BOX_SHAPES).default("jar"),
  enabled: z.boolean().default(true),
});

export const boxCategorySchema = z.object({
  id,
  name: z.string().min(1).max(40),
  /** "products": shop products (their own options, prices and stock). "custom": options added here. */
  kind: z.enum(["products", "custom"]),
  /** products: every active product in this shop category (and its sub-categories) can go in */
  categorySlug: z.string().max(120).default(""),
  /** products: per-product space/shape, and products added one by one */
  products: z.array(boxProductFitSchema).max(60).default([]),
  /** products: the space and shape for products without their own line */
  fallback: z.object({ w: z.number().int().min(1).max(4).default(1), h: z.number().int().min(1).max(4).default(1), heightCm: z.number().min(0.5).max(30).default(7), shape: z.enum(BOX_SHAPES).default("jar") }).default({ w: 1, h: 1, heightCm: 7, shape: "jar" }),
  options: z.array(boxOptionSchema).max(40).default([]),
  enabled: z.boolean().default(true),
});

export const boxSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().max(60).default("Build your own box"),
  intro: z.string().max(240).default("Pick a size, dress it by hand, fill every compartment, write the card. We pack and seal it for you."),
  cellCm: z.number().min(2).max(15).default(5),
  packDays: z.number().int().min(0).max(30).default(2),
  maxPerOrder: z.number().int().min(1).max(10).default(3),
  sizes: z.array(boxSizeSchema).min(1).max(16),
  finishes: z.array(decorOptionSchema).min(1).max(12),
  ribbons: z.array(decorOptionSchema).min(1).max(12),
  fillers: z.array(decorOptionSchema).min(1).max(12),
  seals: z.array(decorOptionSchema).max(12).default([]),
  categories: z.array(boxCategorySchema).max(20).default([]),
  card: z.object({
    papers: z.array(decorOptionSchema).min(1).max(8),
    maxMessage: z.number().int().min(40).max(600).default(300),
    voiceNote: z.object({ enabled: z.boolean().default(true), price: money.default(4900) }).default({ enabled: true, price: 4900 }),
  }),
  ownGift: z.object({
    enabled: z.boolean().default(true),
    maxCells: z.number().int().min(1).max(16).default(6),
    pickupEnabled: z.boolean().default(true),
    pickupFee: money.default(14900),
    pickupArea: z.string().max(80).default("within our city"),
    /** Where customers drop or courier their gift. Sent with the order, never shown publicly. */
    address: z.string().max(400).default(""),
  }),
});
export type BoxSettings = z.infer<typeof boxSettingsSchema>;
export type BoxCategorySettings = z.infer<typeof boxCategorySchema>;
export type DecorOption = z.infer<typeof decorOptionSchema>;

const D = (id: string, name: string, price: number, color: string, pattern: (typeof FINISH_PATTERNS)[number] = "plain") => ({ id, name, price, color, pattern, image: null, enabled: true });

export const DEFAULT_BOXES: BoxSettings = {
  enabled: true,
  title: "Build your own box",
  intro: "Pick a size, dress it by hand, fill every compartment, write the card. We pack and seal it for you.",
  cellCm: 5,
  packDays: 2,
  maxPerOrder: 3,
  sizes: [
    { id: "3x3", name: "Petite", cols: 3, rows: 3, price: 29900, depthCm: 9, enabled: true },
    { id: "3x4", name: "Slim", cols: 4, rows: 3, price: 34900, depthCm: 9, enabled: true },
    { id: "4x4", name: "Classic", cols: 4, rows: 4, price: 44900, depthCm: 9, enabled: true },
    { id: "4x6", name: "Long", cols: 6, rows: 4, price: 59900, depthCm: 9, enabled: true },
    { id: "5x5", name: "Generous", cols: 5, rows: 5, price: 69900, depthCm: 10, enabled: true },
    { id: "6x6", name: "Grand", cols: 6, rows: 6, price: 89900, depthCm: 12, enabled: true },
    { id: "6x8", name: "Hamper", cols: 8, rows: 6, price: 119900, depthCm: 12, enabled: true },
    { id: "8x8", name: "Trunk", cols: 8, rows: 8, price: 149900, depthCm: 12, enabled: true },
  ],
  finishes: [
    D("kraft", "Natural kraft", 0, "#c49a62", "kraft"),
    D("marbled", "Hand-marbled paper", 14900, "#8fa6c0", "marbled"),
    D("blockprint", "Sanganer block print", 19900, "#2d3a6b", "blockprint"),
    D("festive", "Festive red, gold foil", 17900, "#8e1f1f", "foil"),
    D("pine", "Pine wood crate", 44900, "#d4ab72", "wood"),
  ],
  ribbons: [D("jute", "Jute twine", 0, "#8a6a3e"), D("cotton", "Ivory cotton", 4900, "#efe6d2"), D("silk", "Marigold silk", 7900, "#e3a224"), D("velvet", "Maroon velvet", 9900, "#6e1b24")],
  fillers: [D("crinkle", "Crinkle kraft", 0, "#b9894f"), D("woodwool", "Wood wool", 4900, "#e2cf9f"), D("rose", "Dried rose petals", 12900, "#b2323f"), D("marigold", "Marigold petals", 9900, "#e8961c")],
  seals: [D("maroon", "Maroon wax", 9900, "#7a1f16"), D("gold", "Gold wax", 9900, "#b8892b"), D("forest", "Forest wax", 9900, "#2f4a2c")],
  categories: [
    { id: "candles", name: "Candles", kind: "products", categorySlug: "candles", products: [], fallback: { w: 1, h: 1, heightCm: 7, shape: "jar" }, options: [], enabled: true },
  ],
  card: {
    papers: [D("cotton", "Cotton rag paper", 0, "#f7efe1"), D("flower", "Pressed-flower paper", 4900, "#f6ece4"), D("seed", "Seed paper (plant it)", 6900, "#efe7d4")],
    maxMessage: 300,
    voiceNote: { enabled: true, price: 4900 },
  },
  ownGift: { enabled: true, maxCells: 6, pickupEnabled: true, pickupFee: 14900, pickupArea: "within our city", address: "" },
};

/** Handwriting styles offered for the card. Kalam also writes Devanagari. */
export const CARD_FONTS = [
  { id: "kalam", name: "Kalam", note: "writes Hindi too" },
  { id: "caveat", name: "Caveat", note: "" },
  { id: "apple", name: "Homemade Apple", note: "" },
] as const;
export type CardFontId = (typeof CARD_FONTS)[number]["id"];

/* ------------------------------------------------------------------ */
/* One customer's box                                                  */
/* ------------------------------------------------------------------ */

const cell = z.number().int().min(0).max(9);
const span = z.number().int().min(1).max(10);

export const boxPlacementSchema = z.object({
  /** "opt:<categoryId>:<optionId>" for owner-made options, "prod:<productId>" for shop products */
  ref: z.string().min(3).max(120),
  x: cell, y: cell, w: span, h: span,
  selections: z.array(z.object({ groupId: z.string().max(64), valueId: z.string().max(64) })).max(8).default([]),
  personalization: z.string().max(80).nullish(),
});

export const boxConfigSchema = z.object({
  v: z.literal(1).default(1),
  sizeId: z.string().min(1).max(40),
  finish: z.string().max(40),
  ribbon: z.string().max(40),
  filler: z.string().max(40),
  /** "" = no seal */
  seal: z.string().max(40).default(""),
  sealLetter: z.string().max(4).default(""),
  lidName: z.string().max(24).default(""),
  card: z.object({
    paper: z.string().max(40),
    font: z.string().max(20).default("kalam"),
    to: z.string().max(40).default(""),
    message: z.string().max(600).default(""),
    from: z.string().max(40).default(""),
    voice: z.boolean().default(false),
  }),
  items: z.array(boxPlacementSchema).max(100).default([]),
  own: z.object({ x: cell, y: cell, w: span, h: span, way: z.enum(["drop", "pickup", "courier"]) }).nullish(),
});
export type BoxConfig = z.infer<typeof boxConfigSchema>;
export type BoxPlacement = z.infer<typeof boxPlacementSchema>;
