"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { StoreSettings, MembershipTier } from "@/lib/settings-schema";
import { paiseToRupeesString, rupeesToPaise } from "@/lib/money";
import { saveSettingsParts } from "@/actions/admin/settings";
import { cn } from "@/lib/utils";
import { Panel, Toggle, Tag } from "./ui";
import { ImageField } from "./image-field";
import { StringListEditor } from "./links-editor";
import { CopyButton } from "./copy-button";
import { SaveBar } from "./save-bar";
import { EditorTabs } from "./editor-tabs";
import { SocialIcon } from "@/components/ui/social-icons";
import { DeliveryRewards, deliveryFromCommerce, giftsFromCommerce, readRewards, type DeliveryEdit, type GiftEdit, type Upsell, type RewardsCategory } from "./delivery-rewards";
import type { PickableProduct } from "./product-picker";

type Gateways = { razorpay: boolean; razorpayWebhook: boolean; cashfree: boolean; cashfreeEnv: string; blob: boolean; email: boolean };
export type SettingsTab = "delivery" | "store" | "checkout" | "payments" | "membership" | "seo";
type Tab = SettingsTab;

function Rupee({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const bad = value.trim() !== "" && rupeesToPaise(value) === null;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span><input id={id} inputMode="decimal" autoComplete="off" aria-invalid={bad} className="field !pl-7" value={value} onChange={(e) => onChange(e.target.value)} /></div>
      {bad ? <p className="error-text">Enter an amount like 999 or 49.50</p> : hint && <p className="hint">{hint}</p>}
    </div>
  );
}
function Num({ id, label, value, onChange, min = 0, max = 999, hint }: { id: string; label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; hint?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} className="field" value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Math.max(min, Math.min(max, Math.trunc(Number(e.target.value) || 0))))} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

type TierEdit = Omit<MembershipTier, "minSpend"> & { minSpend: string };

type Props = { initial: StoreSettings; gateways: Gateways; webhooks: { razorpay: string; cashfree: string }; initialTab?: Tab; products: PickableProduct[]; categories: RewardsCategory[] };
const TABS: [Tab, string][] = [["delivery", "Delivery & rewards"], ["checkout", "Checkout & returns"], ["payments", "Payments"], ["membership", "Membership"], ["seo", "Search & sharing"], ["store", "Contact & social"]];

/** Remounting with a new key throws away unsaved edits ("Discard") and picks up freshly saved settings. */
export function SettingsForm(props: Props) {
  const [k, setK] = useState(0);
  return <Form key={k} {...props} onDiscard={() => setK((x) => x + 1)} />;
}

function Form({ initial, gateways, webhooks, initialTab, onDiscard, products, categories }: Props & { onDiscard: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab && TABS.some(([t]) => t === initialTab) ? initialTab : "delivery");
  const [seo, setSeo] = useState(initial.seo);
  const c0 = initial.commerce;
  const [commerce, setCommerce] = useState(c0);
  const [delivery, setDeliveryState] = useState<DeliveryEdit>(() => deliveryFromCommerce(c0));
  const [gifts, setGiftsState] = useState<GiftEdit[]>(() => giftsFromCommerce(c0));
  const [upsell, setUpsellState] = useState<Upsell>(c0.upsell);
  const setDelivery = (p: Partial<DeliveryEdit>) => { setDirty(true); setDeliveryState((d) => ({ ...d, ...p })); };
  const setGifts = (g: GiftEdit[]) => { setDirty(true); setGiftsState(g); };
  const setUpsell = (p: Partial<Upsell>) => { setDirty(true); setUpsellState((u) => ({ ...u, ...p })); };
  const [money, setMoney] = useState({ giftWrapPrice: paiseToRupeesString(c0.giftWrapPrice), codFee: paiseToRupeesString(c0.codFee), codMaxOrder: paiseToRupeesString(c0.codMaxOrder) });
  const [membership, setMembership] = useState({ enabled: initial.membership.enabled, name: initial.membership.name });
  const [tiers, setTiers] = useState<TierEdit[]>(initial.membership.tiers.map((t) => ({ ...t, minSpend: paiseToRupeesString(t.minSpend) || "0" })));
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const cm = (patch: Partial<typeof commerce>) => { setDirty(true); setCommerce((s) => ({ ...s, ...patch })); };
  const mn = (patch: Partial<typeof money>) => { setDirty(true); setMoney((s) => ({ ...s, ...patch })); };
  const setTier = (i: number, patch: Partial<TierEdit>) => { setDirty(true); setTiers((ts) => ts.map((t, k) => (k === i ? { ...t, ...patch } : t))); };

  function save() {
    const m: Record<string, number> = {};
    for (const [k, v] of Object.entries(money)) {
      const p = rupeesToPaise(v || "0");
      if (p === null) { toast.error(`Check the amount for ${k.replace(/([A-Z])/g, " $1").toLowerCase()}`); setTab("checkout"); return; }
      m[k] = p;
    }
    const t: MembershipTier[] = [];
    for (const x of tiers) {
      const p = rupeesToPaise(x.minSpend || "0");
      if (p === null || !x.name.trim()) { toast.error("Each tier needs a name and a valid minimum spend"); setTab("membership"); return; }
      t.push({ ...x, name: x.name.trim(), minSpend: p, perks: x.perks.map((s) => s.trim()).filter(Boolean) });
    }
    if (!t.length) { toast.error("Keep at least one membership tier"); return; }
    const rw = readRewards(delivery, gifts, upsell, products);
    if (!rw.ok) { toast.error(rw.error); setTab("delivery"); return; }
    const { ok: _ok, ...rewards } = rw;
    void _ok;
    const parts: Partial<StoreSettings> = { seo, commerce: { ...commerce, ...m, ...rewards }, membership: { ...membership, tiers: t } };
    start(async () => {
      const r = await saveSettingsParts(parts);
      if (r.ok) { setDirty(false); setGiftsState(giftsFromCommerce({ ...commerce, ...rewards })); toast.success(r.message ?? "Saved"); router.refresh(); }
      else toast.error(r.error);
    });
  }

  const Status = ({ okay, label }: { okay: boolean; label: string }) => <div className="flex min-h-11 items-center justify-between gap-2 text-[15px]"><span>{label}</span>{okay ? <Tag tone="green">Configured</Tag> : <Tag tone="red">Missing</Tag>}</div>;

  return (
    <div>
      <EditorTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "delivery" && (
        <DeliveryRewards delivery={delivery} setDelivery={setDelivery} gifts={gifts} setGifts={setGifts} upsell={upsell} setUpsell={setUpsell} products={products} categories={categories} />
      )}

      {tab === "store" && (
        <Panel title="Store details" description="Name, logo, contact details and social media links are all edited in one place.">
          <Link href="/admin/appearance?tab=brand" className="flex min-h-11 items-center gap-3 rounded-lg border border-black/10 p-4 hover:border-black/25">
            <span className="flex shrink-0 gap-1 text-muted" aria-hidden><SocialIcon name="instagram" size={20} /><SocialIcon name="whatsapp" size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">Open Appearance → Brand, contact & social</span>
              <span className="block text-[14px] text-muted">Email, phone, WhatsApp, address, GSTIN, Instagram, Facebook, YouTube, Pinterest, X and Google Maps.</span>
            </span>
            <ChevronRight size={20} aria-hidden />
          </Link>
        </Panel>
      )}

      {tab === "checkout" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Delivery times" description="Shown on product pages and order emails. The delivery charge is under Delivery & rewards.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Num id="dd" label="Dispatch within (days)" value={commerce.dispatchDays} max={30} onChange={(v) => cm({ dispatchDays: v })} />
              <Num id="dmin" label="Delivery days, from" value={commerce.deliveryDaysMin} min={1} max={30} onChange={(v) => cm({ deliveryDaysMin: v })} />
              <Num id="dmax" label="Delivery days, up to" value={commerce.deliveryDaysMax} min={1} max={45} onChange={(v) => cm({ deliveryDaysMax: v })} />
            </div>
          </Panel>
          <Panel title="Gifting">
            <Toggle label="Offer gift wrapping" checked={commerce.giftWrapEnabled} onChange={(v) => cm({ giftWrapEnabled: v })} />
            {commerce.giftWrapEnabled && <div className="mt-4 max-w-xs"><Rupee id="gw" label="Gift wrap price" value={money.giftWrapPrice} onChange={(v) => mn({ giftWrapPrice: v })} hint="Paid membership tiers get it free" /></div>}
          </Panel>
          <Panel title="Cart & inventory">
            <div className="grid gap-4 sm:grid-cols-2">
              <Num id="mq" label="Max quantity per item" value={commerce.maxQtyPerLine} min={1} max={99} onChange={(v) => cm({ maxQtyPerLine: v })} />
              <Num id="ls" label="Low-stock alert at" value={commerce.lowStockThreshold} max={1000} onChange={(v) => cm({ lowStockThreshold: v })} />
              <div className="sm:col-span-2"><label className="label" htmlFor="tx">Tax note</label><input id="tx" className="field" value={commerce.taxNote} onChange={(e) => cm({ taxNote: e.target.value })} /></div>
            </div>
          </Panel>
          <Panel title="Returns">
            <Toggle label="Allow return requests" hint="Customers can request a return from their order page after delivery." checked={commerce.returnsEnabled} onChange={(v) => cm({ returnsEnabled: v })} />
            {commerce.returnsEnabled && <div className="mt-4 max-w-xs"><Num id="rd" label="Return window (days after delivery)" value={commerce.returnDays} max={60} onChange={(v) => cm({ returnDays: v })} /></div>}
          </Panel>
        </div>
      )}

      {tab === "payments" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Payment methods at checkout" description="A gateway only appears when it is switched on here AND its keys are set in Vercel environment variables.">
            <Toggle label="Cashfree (UPI, cards, netbanking, wallets)" checked={commerce.cashfreeEnabled} onChange={(v) => cm({ cashfreeEnabled: v })} hint={gateways.cashfree ? `Keys found · ${gateways.cashfreeEnv} mode` : "Keys missing: CASHFREE_APP_ID, CASHFREE_SECRET_KEY"} />
            <Toggle label="Razorpay (UPI, cards, netbanking, wallets)" checked={commerce.razorpayEnabled} onChange={(v) => cm({ razorpayEnabled: v })} hint={gateways.razorpay ? "Keys found" : "Keys missing: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET"} />
            <div className="mt-3">
              <label className="label" htmlFor="pg">Show first</label>
              <select id="pg" className="field" value={commerce.preferredGateway} onChange={(e) => cm({ preferredGateway: e.target.value as "razorpay" | "cashfree" })}><option value="cashfree">Cashfree</option><option value="razorpay">Razorpay</option></select>
            </div>
            <div className="mt-4 border-t border-black/10 pt-3">
              <Toggle label="Cash on delivery" checked={commerce.codEnabled} onChange={(v) => cm({ codEnabled: v })} />
              {commerce.codEnabled && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Rupee id="cf" label="COD fee" value={money.codFee} onChange={(v) => mn({ codFee: v })} />
                  <Rupee id="cm" label="COD only up to" value={money.codMaxOrder} onChange={(v) => mn({ codMaxOrder: v })} hint="0 = no limit" />
                </div>
              )}
            </div>
          </Panel>
          <div className="space-y-6">
            <Panel title="Configuration status">
              <Status okay={gateways.cashfree} label="Cashfree API keys" />
              <Status okay={gateways.razorpay} label="Razorpay API keys" />
              <Status okay={gateways.razorpayWebhook} label="Razorpay webhook secret" />
              <Status okay={gateways.blob} label="Image storage (Vercel Blob)" />
              <Status okay={gateways.email} label="Order emails (Resend)" />
            </Panel>
            <Panel title="Webhook URLs" description="Paste these in each gateway's dashboard so payments confirm even if the customer closes the page.">
              <div className="space-y-3 text-[14px]">
                <div>
                  <b>Cashfree</b> <span className="text-muted">— Developers → Webhooks, “Payment” events (version 2023-08-01)</span>
                  <div className="mt-1 flex items-center gap-2 rounded bg-field/70 p-2"><code className="flex-1 break-all text-[13px]">{webhooks.cashfree}</code><CopyButton text={webhooks.cashfree} /></div>
                </div>
                <div>
                  <b>Razorpay</b> <span className="text-muted">— Settings → Webhooks, events payment.captured, payment.failed, order.paid. Use the same secret as RAZORPAY_WEBHOOK_SECRET.</span>
                  <div className="mt-1 flex items-center gap-2 rounded bg-field/70 p-2"><code className="flex-1 break-all text-[13px]">{webhooks.razorpay}</code><CopyButton text={webhooks.razorpay} /></div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "membership" && (
        <div className="space-y-6">
          <Panel title="Programme">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Toggle label="Membership programme on" hint="Members earn tiers from lifetime spend on paid, non-cancelled orders. Tier discounts apply automatically at checkout." checked={membership.enabled} onChange={(v) => { setDirty(true); setMembership((m) => ({ ...m, enabled: v })); }} /></div>
              <div><label className="label" htmlFor="mname">Programme name</label><input id="mname" className="field" value={membership.name} onChange={(e) => { setDirty(true); setMembership((m) => ({ ...m, name: e.target.value })); }} /></div>
            </div>
          </Panel>
          <Panel title="Tiers" description="Sorted by minimum spend when saved. The first tier must start at ₹0.">
            <div className="space-y-3">
              {tiers.map((t, i) => (
                <fieldset key={i} className="rounded-lg border border-black/10 p-4">
                  <legend className="sr-only">Tier {i + 1}</legend>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_120px_96px_auto]">
                    <div><label className="label" htmlFor={`tn-${i}`}>Name</label><input id={`tn-${i}`} className="field" value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} /></div>
                    <Rupee id={`ts-${i}`} label="Lifetime spend from" value={t.minSpend} onChange={(v) => setTier(i, { minSpend: v })} />
                    <div><label className="label" htmlFor={`td-${i}`}>Discount %</label><input id={`td-${i}`} type="number" min={0} max={50} step={0.5} className="field" value={t.discountPct} onChange={(e) => setTier(i, { discountPct: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} /></div>
                    <div><label className="label" htmlFor={`tc-${i}`}>Colour</label><input id={`tc-${i}`} type="color" className="h-12 w-full cursor-pointer rounded border border-black/10" value={t.color} onChange={(e) => setTier(i, { color: e.target.value })} /></div>
                    <div className="flex items-end gap-1 sm:col-span-2 xl:col-span-1">
                      <button type="button" aria-label="Move tier up" className="icon-btn" disabled={i === 0} onClick={() => { setDirty(true); setTiers((ts) => { const n = [...ts]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; }); }}><ArrowUp size={20} aria-hidden /></button>
                      <button type="button" aria-label="Move tier down" className="icon-btn" disabled={i === tiers.length - 1} onClick={() => { setDirty(true); setTiers((ts) => { const n = [...ts]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; }); }}><ArrowDown size={20} aria-hidden /></button>
                      <button type="button" aria-label="Delete tier" className="icon-btn is-danger" disabled={tiers.length === 1} onClick={() => { setDirty(true); setTiers((ts) => ts.filter((_, k) => k !== i)); }}><Trash2 size={20} aria-hidden /></button>
                    </div>
                  </div>
                  <div className="mt-4"><span className="label">Perks</span><StringListEditor items={t.perks} onChange={(p) => setTier(i, { perks: p })} placeholder="Free gift wrap" addLabel="Add perk" /></div>
                </fieldset>
              ))}
              {tiers.length < 6 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDirty(true); setTiers((ts) => [...ts, { name: "", minSpend: "", discountPct: 0, perks: [], color: "#bda38b" }]); }}><Plus size={15} />Add tier</button>}
            </div>
          </Panel>
        </div>
      )}

      {tab === "seo" && (
        <Panel title="Search & sharing">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div><label className="label" htmlFor="st">Homepage title</label><input id="st" className="field" maxLength={120} value={seo.title} onChange={(e) => { setDirty(true); setSeo((s) => ({ ...s, title: e.target.value })); }} /><p className="hint">{seo.title.length}/60 recommended</p></div>
              <div><label className="label" htmlFor="sd">Description</label><textarea id="sd" rows={4} maxLength={300} className="field" value={seo.description} onChange={(e) => { setDirty(true); setSeo((s) => ({ ...s, description: e.target.value })); }} /><p className="hint">{seo.description.length}/160 recommended</p></div>
            </div>
            <ImageField label="Share image (WhatsApp, Instagram, Facebook)" value={seo.ogImage} onChange={(v) => { setDirty(true); setSeo((s) => ({ ...s, ogImage: v })); }} hint="1200 × 630 px JPG or PNG" />
          </div>
        </Panel>
      )}
      <SaveBar dirty={dirty} pending={pending} onSave={save} onDiscard={onDiscard} />
    </div>
  );
}
