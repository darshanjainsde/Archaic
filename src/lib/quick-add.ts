import { cart, express } from "./cart-store";
import { lineKey, resolveLine } from "./pricing";
import type { OptionGroup, Personalization, Selection } from "./types";
import { BAG_ADDED_EVENT } from "@/components/store/bag-events";

/** The selections a product page opens with: the first available value of every required group. Shared by the product page, the hero card and quick add. */
export function defaultSelections(groups: OptionGroup[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of groups) {
    if (!g.required) continue;
    const first = g.values.find((v) => v.available);
    if (first) out[g.id] = first.id;
  }
  return out;
}

export type QuickAddProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  options: OptionGroup[];
  personalization: Personalization | null;
};

/** Can this product go into the bag with its default options and no typed text? */
export function canAddWithDefaults(p: Pick<QuickAddProduct, "price" | "options" | "personalization">): boolean {
  const sel = defaultSelections(p.options);
  const selections: Selection[] = Object.entries(sel).map(([groupId, valueId]) => ({ groupId, valueId }));
  return resolveLine(p.price, p.options, selections, p.personalization, "").ok;
}

/**
 * Adds one of the product with its default options (client only), fires the bag-added event, and reports what happened.
 * "max": the bag already holds the most allowed; "invalid": the product needs choices first (send the customer to its page).
 */
export function addWithDefaults(p: QuickAddProduct, maxQty = 10): "added" | "max" | "invalid" {
  const sel = defaultSelections(p.options);
  const selections: Selection[] = Object.entries(sel).map(([groupId, valueId]) => ({ groupId, valueId }));
  const res = resolveLine(p.price, p.options, selections, p.personalization, "");
  if (!res.ok) return "invalid";
  const key = lineKey(p.id, selections, res.personalization);
  const existing = cart.get().lines.find((l) => l.key === key)?.quantity ?? 0;
  if (existing >= maxQty) return "max";
  cart.add(
    { key, productId: p.id, slug: p.slug, name: p.name, image: res.optionImage ?? p.image, unitPrice: res.unitPrice, quantity: 1, selections, selectionLabels: res.snapshot, personalization: res.personalization ?? undefined },
    maxQty,
  );
  window.dispatchEvent(new Event(BAG_ADDED_EVENT));
  return "added";
}

/** Buy now with default options: put ONLY this product in the express checkout (the bag is left alone). */
export function buyNowWithDefaults(p: QuickAddProduct): "ok" | "invalid" {
  const sel = defaultSelections(p.options);
  const selections: Selection[] = Object.entries(sel).map(([groupId, valueId]) => ({ groupId, valueId }));
  const res = resolveLine(p.price, p.options, selections, p.personalization, "");
  if (!res.ok) return "invalid";
  express.set({ key: lineKey(p.id, selections, res.personalization), productId: p.id, slug: p.slug, name: p.name, image: res.optionImage ?? p.image, unitPrice: res.unitPrice, quantity: 1, selections, selectionLabels: res.snapshot, personalization: res.personalization ?? undefined });
  return "ok";
}
