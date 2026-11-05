"use client";
import { useId } from "react";
import { Gift, Plus, Trash2 } from "lucide-react";
import type { StoreSettings } from "@/lib/settings-schema";
import { formatMoney, paiseToRupeesString, rupeesToPaise } from "@/lib/money";
import { uid } from "@/lib/utils";
import { Panel, Toggle } from "./ui";
import { ProductPicker, type PickableProduct } from "./product-picker";
import { useConfirm } from "./confirm";

type Commerce = StoreSettings["commerce"];
export type Upsell = Commerce["upsell"];
export type GiftEdit = { id: string; enabled: boolean; threshold: string; productSlug: string; label: string };
export type DeliveryEdit = { charge: boolean; flat: string; free: string };
export type RewardsCategory = { id: string; slug: string; name: string; parentId: string | null };

export const MAX_GIFTS = 5;

export function deliveryFromCommerce(c: Commerce): DeliveryEdit {
  return { charge: c.flatShipping > 0, flat: c.flatShipping > 0 ? paiseToRupeesString(c.flatShipping) : "79", free: c.freeShippingThreshold > 0 ? paiseToRupeesString(c.freeShippingThreshold) : "999" };
}
export function giftsFromCommerce(c: Commerce): GiftEdit[] {
  return [...c.freeGifts].sort((a, b) => a.threshold - b.threshold).map((g) => ({ ...g, threshold: paiseToRupeesString(g.threshold) }));
}

/** Turns the edit state into saved values, or explains the first problem in plain words. */
export function readRewards(d: DeliveryEdit, gifts: GiftEdit[], upsell: Upsell, products: PickableProduct[]):
  { ok: true; flatShipping: number; freeShippingThreshold: number; freeGifts: Commerce["freeGifts"]; upsell: Upsell } | { ok: false; error: string } {
  let flatShipping = 0;
  let freeShippingThreshold = 0;
  if (d.charge) {
    const f = rupeesToPaise(d.flat);
    if (f === null || f <= 0) return { ok: false, error: "Enter the delivery charge, e.g. 79. To make delivery free, switch off “Charge for delivery”." };
    const t = rupeesToPaise(d.free || "0");
    if (t === null) return { ok: false, error: "Check the free-delivery amount, e.g. 999." };
    flatShipping = f;
    freeShippingThreshold = t;
  }
  const out: Commerce["freeGifts"] = [];
  for (const [i, g] of gifts.entries()) {
    const t = rupeesToPaise(g.threshold);
    if (t === null || t <= 0) return { ok: false, error: `Free gift ${i + 1}: enter the order amount that unlocks it, e.g. 1499.` };
    if (!g.productSlug) return { ok: false, error: `Free gift ${i + 1}: choose the gift product.` };
    if (out.some((x) => x.threshold === t)) return { ok: false, error: `Two free gifts unlock at ${formatMoney(t)}. Give each gift a different amount.` };
    const name = products.find((p) => p.slug === g.productSlug)?.name ?? "gift";
    out.push({ id: g.id, enabled: g.enabled, threshold: t, productSlug: g.productSlug, label: g.label.trim() || `Free ${name.toLowerCase()}` });
  }
  out.sort((a, b) => a.threshold - b.threshold);
  if (upsell.source === "category" && !upsell.categorySlug) return { ok: false, error: "Bag suggestions: choose the category to suggest from." };
  return { ok: true, flatShipping, freeShippingThreshold, freeGifts: out, upsell: { ...upsell, heading: upsell.heading.trim(), limit: Math.max(2, Math.min(12, upsell.limit)) } };
}

function RupeeInput({ id, label, value, onChange, hint, disabled, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; disabled?: boolean; placeholder?: string }) {
  const bad = !disabled && value.trim() !== "" && rupeesToPaise(value) === null;
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-muted">₹</span>
        <input id={id} inputMode="decimal" autoComplete="off" disabled={disabled} aria-invalid={bad} aria-describedby={`${id}-h`} className="field !pl-8 tabular-nums" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      {bad ? <p id={`${id}-h`} className="error-text">Enter an amount like 999 or 49.50</p> : hint ? <p id={`${id}-h`} className="hint">{hint}</p> : null}
    </div>
  );
}

/** A plain sentence that says what shoppers will see. */
function Preview({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-black/[.04] p-3 text-[15px] leading-6" aria-live="polite"><span className="font-semibold">Shoppers see: </span>{children}</p>;
}

export function DeliveryRewards({ delivery, setDelivery, gifts, setGifts, upsell, setUpsell, products, categories }: {
  delivery: DeliveryEdit; setDelivery: (p: Partial<DeliveryEdit>) => void;
  gifts: GiftEdit[]; setGifts: (g: GiftEdit[]) => void;
  upsell: Upsell; setUpsell: (p: Partial<Upsell>) => void;
  products: PickableProduct[]; categories: RewardsCategory[];
}) {
  const id = useId();
  const confirm = useConfirm();
  const flat = rupeesToPaise(delivery.flat);
  const free = rupeesToPaise(delivery.free || "0");

  let deliverySentence: string;
  if (!delivery.charge) deliverySentence = "Delivery is free on every order.";
  else if (flat === null || flat <= 0) deliverySentence = "Enter a delivery charge to see the sentence.";
  else if (!free) deliverySentence = `Every order pays ${formatMoney(flat)} delivery.`;
  else deliverySentence = `Orders under ${formatMoney(free)} pay ${formatMoney(flat)} delivery. ${formatMoney(free)} and above ship free.`;

  const setGift = (i: number, p: Partial<GiftEdit>) => setGifts(gifts.map((g, k) => (k === i ? { ...g, ...p } : g)));
  const thresholds = gifts.map((g) => rupeesToPaise(g.threshold));
  const tops = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-6">
      <Panel title="Delivery charge" description="What shoppers pay for delivery, and when it becomes free.">
        <Toggle label="Charge for delivery" hint="Off: delivery is always free." checked={delivery.charge} onChange={(v) => setDelivery({ charge: v })} />
        {delivery.charge && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <RupeeInput id={`${id}-flat`} label="Delivery charge" value={delivery.flat} onChange={(v) => setDelivery({ flat: v })} placeholder="e.g. 79" hint="Added to orders below the free-delivery amount." />
            <RupeeInput id={`${id}-free`} label="Free delivery when the order is at least" value={delivery.free} onChange={(v) => setDelivery({ free: v })} placeholder="e.g. 999" hint="Measured after discounts. Leave empty or 0 to always charge." />
          </div>
        )}
        <div className="mt-4"><Preview>{deliverySentence}</Preview></div>
      </Panel>

      <Panel title="Free gifts" description="A free product added to the order when it reaches an amount (after discounts). Up to 5.">
        <div className="space-y-4">
          {gifts.length === 0 && <p className="text-[15px] text-muted">No free gifts. Add one to reward bigger orders.</p>}
          {gifts.map((g, i) => {
            const t = thresholds[i];
            const dup = t !== null && t > 0 && thresholds.some((x, k) => k !== i && x === t);
            const product = products.find((p) => p.slug === g.productSlug);
            const out = product && product.stock !== undefined && product.stock !== null && product.stock <= 0;
            const gid = `${id}-g${i}`;
            return (
              <fieldset key={g.id} className="min-w-0 rounded-lg border border-black/10 p-4">
                <legend className="flex items-center gap-2 px-1 text-[14px] font-semibold text-muted"><Gift size={16} aria-hidden />Free gift {i + 1}</legend>
                <Toggle label="Offer this gift" checked={g.enabled} onChange={(v) => setGift(i, { enabled: v })} />
                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  <div className="min-w-0">
                    <RupeeInput id={`${gid}-t`} label="When the order reaches" value={g.threshold} onChange={(v) => setGift(i, { threshold: v })} placeholder="e.g. 1499" />
                    {dup && <p className="error-text">Another gift unlocks at this amount. Use a different one.</p>}
                    {t === 0 && <p className="error-text">Use an amount above ₹0.</p>}
                  </div>
                  <div className="min-w-0">
                    <label className="label" htmlFor={`${gid}-l`}>Label shoppers see</label>
                    <input id={`${gid}-l`} className="field" autoComplete="off" placeholder="e.g. Free long matches" value={g.label} onChange={(e) => setGift(i, { label: e.target.value })} />
                    <p className="hint">Shown in the bag’s progress bar.</p>
                  </div>
                  <div className="min-w-0 md:col-span-2">
                    <ProductPicker label="Gift product" value={g.productSlug} onChange={(v) => setGift(i, { productSlug: v })} products={products} noneLabel="Choose a product…" showStock />
                    {out && <p className="error-text">Out of stock: this gift won’t be offered while it is out of stock.</p>}
                  </div>
                </div>
                {product && t && t > 0 && (
                  <div className="mt-4"><Preview>At {formatMoney(t)}, shoppers get {product.name} free{g.enabled ? "." : " (switched off for now)."}</Preview></div>
                )}
                <div className="mt-2 flex justify-end">
                  <button type="button" className="text-btn is-danger -mr-3" onClick={async () => { if (await confirm({ title: `Remove free gift ${i + 1}?`, body: "Shoppers stop getting it when you save. To pause it instead, switch off “Offer this gift”.", confirmLabel: "Remove gift", danger: true })) setGifts(gifts.filter((_, k) => k !== i)); }}><Trash2 size={18} aria-hidden />Remove gift</button>
                </div>
              </fieldset>
            );
          })}
          {gifts.length < MAX_GIFTS && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setGifts([...gifts, { id: `g-${uid().slice(0, 6)}`, enabled: true, threshold: "", productSlug: "", label: "" }])}><Plus size={18} aria-hidden />Add a free gift</button>
          )}
          <p className="hint">Gifts are listed by amount when you save.</p>
        </div>
      </Panel>

      <Panel title="Bag & checkout suggestions" description="We show the products that close the gap to free delivery or the next gift first.">
        <Toggle label="Show suggestions in the bag" checked={upsell.enabled} onChange={(v) => setUpsell({ enabled: v })} />
        {upsell.enabled && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="min-w-0 md:col-span-2">
              <label className="label" htmlFor={`${id}-uh`}>Heading</label>
              <input id={`${id}-uh`} className="field" autoComplete="off" placeholder="e.g. Add one of these for free delivery" value={upsell.heading} onChange={(e) => setUpsell({ heading: e.target.value })} />
            </div>
            <div className="min-w-0">
              <label className="label" htmlFor={`${id}-us`}>Suggest from</label>
              <select id={`${id}-us`} className="field" value={upsell.source} onChange={(e) => setUpsell({ source: e.target.value as Upsell["source"] })}>
                <option value="bestsellers">Bestsellers</option><option value="featured">Featured products</option><option value="new">Newest</option><option value="category">One category</option>
              </select>
            </div>
            {upsell.source === "category" && (
              <div className="min-w-0">
                <label className="label" htmlFor={`${id}-uc`}>Category</label>
                <select id={`${id}-uc`} className="field" value={upsell.categorySlug} aria-invalid={!upsell.categorySlug} onChange={(e) => setUpsell({ categorySlug: e.target.value })}>
                  <option value="">Choose…</option>
                  {tops.map((c) => (
                    <optgroup key={c.slug} label={c.name}>
                      <option value={c.slug}>{c.name} (all)</option>
                      {categories.filter((k) => k.parentId === c.id).map((k) => <option key={k.slug} value={k.slug}>{k.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
            <div className="min-w-0">
              <label className="label" htmlFor={`${id}-ul`}>How many</label>
              <input id={`${id}-ul`} type="number" inputMode="numeric" min={2} max={12} className="field" value={upsell.limit} onChange={(e) => setUpsell({ limit: Math.max(2, Math.min(12, Math.trunc(Number(e.target.value) || 2))) })} />
              <p className="hint">Between 2 and 12.</p>
            </div>
            <div className="md:col-span-2"><Toggle label="Also show at checkout" hint="A short row above the payment button." checked={upsell.onCheckout} onChange={(v) => setUpsell({ onCheckout: v })} /></div>
          </div>
        )}
      </Panel>
    </div>
  );
}
