import { resolveLine } from "@/lib/pricing";
import type { OptionGroup, Personalization, SelectionSnapshot } from "@/lib/types";
import { CARD_FONTS, type BoxConfig, type BoxShape } from "./schema";

/**
 * Pure box logic shared by the builder (live estimate) and the server (authoritative quote).
 * Nothing here touches the database: the server builds a BoxCatalog from settings + products and
 * passes it in, the builder receives the same catalog from the page.
 */

export type CatalogDecor = { id: string; name: string; price: number; color: string; image: string | null; pattern: string };
export type CatalogItem = {
  /** "opt:<cat>:<opt>" or "prod:<productId>" */
  ref: string;
  categoryId: string;
  name: string;
  price: number;
  image: string | null;
  w: number;
  h: number;
  heightCm: number;
  shape: BoxShape;
  color: string;
  details: { label: string; value: string }[];
  product?: { id: string; slug: string; options: OptionGroup[]; personalization: Personalization | null; stock: number | null; shortDescription: string | null };
};
export type BoxCatalog = {
  title: string;
  intro: string;
  cellCm: number;
  packDays: number;
  maxPerOrder: number;
  sizes: { id: string; name: string; cols: number; rows: number; price: number; depthCm: number }[];
  finishes: CatalogDecor[];
  ribbons: CatalogDecor[];
  fillers: CatalogDecor[];
  seals: CatalogDecor[];
  papers: CatalogDecor[];
  maxMessage: number;
  voice: { enabled: boolean; price: number };
  own: { enabled: boolean; maxCells: number; pickupEnabled: boolean; pickupFee: number; pickupArea: string };
  categories: { id: string; name: string; items: CatalogItem[] }[];
};

export type Rect = { x: number; y: number; w: number; h: number };

/* ---------------- packing ---------------- */

export function grid(cols: number, rows: number, rects: Rect[]): number[][] {
  const g = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (const r of rects) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (g[y] && x < cols) g[y][x] = 1;
  return g;
}
export function fitsAt(g: number[][], cols: number, rows: number, r: Rect): boolean {
  if (r.x < 0 || r.y < 0 || r.x + r.w > cols || r.y + r.h > rows) return false;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (g[y][x]) return false;
  return true;
}
/** First free spot scanning row by row, trying the item turned when it is not square. */
export function findSpot(cols: number, rows: number, taken: Rect[], w: number, h: number): Rect | null {
  const g = grid(cols, rows, taken);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (fitsAt(g, cols, rows, { x, y, w, h })) return { x, y, w, h };
      if (w !== h && fitsAt(g, cols, rows, { x, y, w: h, h: w })) return { x, y, w: h, h: w };
    }
  return null;
}
/** Repack everything into a (new) size, largest first. Returns what fitted and what did not. */
export function repack<T extends Rect>(cols: number, rows: number, rects: T[]): { placed: T[]; left: T[] } {
  const placed: T[] = [];
  const left: T[] = [];
  for (const r of [...rects].sort((a, b) => b.w * b.h - a.w * a.h)) {
    const s = findSpot(cols, rows, placed, r.w, r.h);
    if (s) placed.push({ ...r, ...s });
    else left.push(r);
  }
  return { placed, left };
}

/* ---------------- lookups ---------------- */

export function itemByRef(cat: BoxCatalog, ref: string): CatalogItem | null {
  for (const c of cat.categories) for (const i of c.items) if (i.ref === ref) return i;
  return null;
}
const pick = (list: { id: string }[], id: string) => list.find((o) => o.id === id) ?? null;

/* ---------------- pricing + validation ---------------- */

export type BoxLineItem = {
  ref: string;
  name: string;
  productId: string | null;
  slug: string | null;
  image: string | null;
  shape: BoxShape;
  color: string;
  heightCm: number;
  x: number; y: number; w: number; h: number;
  price: number;
  selections: SelectionSnapshot[];
  personalization: string | null;
};
export type BoxSnapshot = {
  v: 1;
  size: { id: string; name: string; cols: number; rows: number; cellCm: number; depthCm: number; outside: string };
  finish: CatalogDecor; ribbon: CatalogDecor; filler: CatalogDecor; seal: CatalogDecor | null;
  sealLetter: string;
  lidName: string;
  card: { paper: CatalogDecor; font: string; to: string; message: string; from: string; voice: boolean };
  items: BoxLineItem[];
  own: (Rect & { way: "drop" | "pickup" | "courier"; fee: number }) | null;
  /** Bill lines shown in the bag, the order and the packing plan */
  lines: { label: string; amount: number }[];
  total: number;
  /** Set on the order item after payment, for the voice note page */
  voice?: { token: string; url?: string | null; uploadedAt?: string | null } | null;
};
export type BoxPriceResult = { ok: true; snapshot: BoxSnapshot } | { ok: false; error: string };

const clean = (s: string | null | undefined, max: number) => (s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const cleanMultiline = (s: string, max: number) => s.replace(/\r/g, "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);

/** Inner depth: the size's depth, deeper when something tall goes in. */
export function boxDepth(base: number, items: { heightCm: number }[]) {
  const tallest = items.reduce((m, i) => Math.max(m, i.heightCm), 0);
  return Math.max(base, Math.ceil(tallest + 1.5));
}

export function priceBox(cat: BoxCatalog, c: BoxConfig): BoxPriceResult {
  const size = cat.sizes.find((s) => s.id === c.sizeId);
  if (!size) return { ok: false, error: "That box size is no longer offered. Pick another size." };
  const finish = pick(cat.finishes, c.finish) as CatalogDecor | null;
  const ribbon = pick(cat.ribbons, c.ribbon) as CatalogDecor | null;
  const filler = pick(cat.fillers, c.filler) as CatalogDecor | null;
  if (!finish || !ribbon || !filler) return { ok: false, error: "One of the box decorations is no longer offered. Choose it again." };
  const seal = c.seal ? (pick(cat.seals, c.seal) as CatalogDecor | null) : null;
  if (c.seal && !seal) return { ok: false, error: "That wax seal is no longer offered." };
  const paper = pick(cat.papers, c.card.paper) as CatalogDecor | null;
  if (!paper) return { ok: false, error: "That card paper is no longer offered." };
  const font = CARD_FONTS.some((f) => f.id === c.card.font) ? c.card.font : "kalam";
  if (c.card.voice && !cat.voice.enabled) return { ok: false, error: "Voice notes are not offered right now." };
  if (c.card.message.length > cat.maxMessage) return { ok: false, error: `The card message is limited to ${cat.maxMessage} characters.` };

  const rects: Rect[] = [];
  const g = () => grid(size.cols, size.rows, rects);
  const place = (r: Rect, what: string): string | null => {
    if (!fitsAt(g(), size.cols, size.rows, r)) return `${what} does not fit where it is. Move it or pick a bigger box.`;
    rects.push(r);
    return null;
  };

  const items: BoxLineItem[] = [];
  for (const p of c.items) {
    const it = itemByRef(cat, p.ref);
    if (!it) return { ok: false, error: "Something in the box is no longer offered. Remove it and add another." };
    const turned = p.w === it.h && p.h === it.w;
    if (!(p.w === it.w && p.h === it.h) && !turned) return { ok: false, error: `${it.name} takes ${it.w} × ${it.h} spaces.` };
    const err = place({ x: p.x, y: p.y, w: p.w, h: p.h }, it.name);
    if (err) return { ok: false, error: err };
    let price = it.price;
    let selections: SelectionSnapshot[] = [];
    let personalization: string | null = null;
    let color = it.color;
    let image = it.image;
    if (it.product) {
      const r = resolveLine(it.price, it.product.options, p.selections ?? [], it.product.personalization, p.personalization);
      if (!r.ok) return { ok: false, error: `${it.name}: ${r.error}` };
      price = r.unitPrice;
      selections = r.snapshot;
      personalization = r.personalization;
      color = r.snapshot.find((s) => s.hex)?.hex ?? color;
      image = r.optionImage ?? image;
    }
    items.push({ ref: it.ref, name: it.name, productId: it.product?.id ?? null, slug: it.product?.slug ?? null, image, shape: it.shape, color, heightCm: it.heightCm, x: p.x, y: p.y, w: p.w, h: p.h, price, selections, personalization });
  }

  // stock for shop products, counted across the whole box
  const perProduct = new Map<string, number>();
  for (const i of items) if (i.productId) perProduct.set(i.productId, (perProduct.get(i.productId) ?? 0) + 1);
  for (const [pid, n] of perProduct) {
    const it = cat.categories.flatMap((x) => x.items).find((x) => x.product?.id === pid);
    const stock = it?.product?.stock;
    if (stock !== null && stock !== undefined && n > stock) return { ok: false, error: stock <= 0 ? `${it!.name} is out of stock.` : `Only ${stock} of ${it!.name} left.` };
  }

  let own: BoxSnapshot["own"] = null;
  if (c.own) {
    if (!cat.own.enabled) return { ok: false, error: "Space for your own gift is not offered right now." };
    if (c.own.w * c.own.h > cat.own.maxCells) return { ok: false, error: `Your own gift can take up to ${cat.own.maxCells} spaces.` };
    if (c.own.way === "pickup" && !cat.own.pickupEnabled) return { ok: false, error: "Pickup is not offered right now. Drop it at the workshop or courier it." };
    const err = place(c.own, "The space for your gift");
    if (err) return { ok: false, error: err };
    own = { ...c.own, fee: c.own.way === "pickup" ? cat.own.pickupFee : 0 };
  }
  if (!items.length && !own) return { ok: false, error: "Add at least one thing to the box." };

  const lines: { label: string; amount: number }[] = [{ label: `${size.name} box, ${size.rows} × ${size.cols}`, amount: size.price }];
  for (const d of [finish, ribbon, filler, seal]) if (d && d.price) lines.push({ label: d.name, amount: d.price });
  for (const i of items) {
    const opts = i.selections.map((s) => s.value).join(", ");
    lines.push({ label: `${i.name}${opts ? ` (${opts})` : ""}${i.personalization ? `, “${i.personalization}”` : ""}`, amount: i.price });
  }
  if (paper.price) lines.push({ label: `Card on ${paper.name.toLowerCase()}`, amount: paper.price });
  if (c.card.voice) lines.push({ label: "Voice note on the card", amount: cat.voice.price });
  if (own && own.fee) lines.push({ label: "Pickup of your gift", amount: own.fee });
  const total = lines.reduce((a, l) => a + l.amount, 0);

  const depth = boxDepth(size.depthCm, items);
  const outside = `${size.cols * cat.cellCm + 1} × ${size.rows * cat.cellCm + 1} × ${depth} cm`;
  return {
    ok: true,
    snapshot: {
      v: 1,
      size: { id: size.id, name: size.name, cols: size.cols, rows: size.rows, cellCm: cat.cellCm, depthCm: depth, outside },
      finish, ribbon, filler, seal,
      sealLetter: seal ? clean(c.sealLetter, 2).slice(0, 1).toUpperCase() : "",
      lidName: clean(c.lidName, 24),
      card: { paper, font, to: clean(c.card.to, 40), message: cleanMultiline(c.card.message, cat.maxMessage), from: clean(c.card.from, 40), voice: c.card.voice },
      items, own, lines, total,
    },
  };
}

/** Short summary shown under the box in the bag, the order and emails. */
export function boxSummary(s: BoxSnapshot): SelectionSnapshot[] {
  const out: SelectionSnapshot[] = [
    { group: "Box", value: `${s.size.name} ${s.size.rows} × ${s.size.cols}, ${s.finish.name.toLowerCase()}` },
    { group: "Inside", value: s.items.length ? `${s.items.length} item${s.items.length === 1 ? "" : "s"}` : "your own gift" },
  ];
  if (s.own) out.push({ group: "Your gift", value: { drop: "you drop it off", pickup: "we pick it up", courier: "you courier it" }[s.own.way] });
  if (s.card.to) out.push({ group: "Card", value: `to ${s.card.to}${s.card.voice ? ", with a voice note" : ""}` });
  return out;
}
