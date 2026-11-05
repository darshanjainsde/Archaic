"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { saveProduct, checkSlug, type ProductInput } from "@/actions/admin/products";
import { paiseToRupeesString, rupeesToPaise, formatMoney } from "@/lib/money";
import { slugify, uid } from "@/lib/utils";
import type { OptionGroup, Personalization, Spec } from "@/lib/types";
import { Panel, Toggle } from "./ui";
import { ImagesEditor, type EditableImage } from "./images-editor";
import { OptionBuilder, signedRupees, type EditGroup } from "./option-builder";
import { MarkdownEditor } from "./markdown-field";
import { SaveBar } from "./save-bar";

export type ProductFormInitial = {
  id: string | null;
  name: string; slug: string; shortDescription: string; description: string;
  price: number | null; compareAtPrice: number | null; sku: string; stock: number; trackInventory: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; featured: boolean; isGiftable: boolean; badge: string; tags: string[]; categoryId: string | null;
  images: EditableImage[]; options: OptionGroup[]; specs: Spec[]; personalization: Personalization | null; seoTitle: string; seoDescription: string;
};

function toEditGroups(groups: OptionGroup[]): EditGroup[] {
  return groups.map((g) => ({ key: uid(), id: g.id, name: g.name, display: g.display, required: g.required, values: g.values.map((v) => ({ key: uid(), id: v.id, label: v.label, note: v.note ?? "", hex: v.hex ?? "#d9c3a0", priceDelta: paiseToRupeesString(v.priceDelta) || "0", image: v.image ?? "", available: v.available })) }));
}

type FormProps = { initial: ProductFormInitial; categories: { id: string; name: string; parentName: string | null }[] };

/** Remounting with a new key throws away unsaved edits ("Discard") and picks up the freshly saved product. */
export function ProductForm(props: FormProps) {
  const [k, setK] = useState(0);
  return <Form key={k} {...props} onDiscard={() => setK((x) => x + 1)} />;
}

function Form({ initial, categories, onDiscard }: FormProps & { onDiscard: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState(() => ({
    name: initial.name, slug: initial.slug, slugTouched: Boolean(initial.id), shortDescription: initial.shortDescription, description: initial.description,
    price: initial.price !== null ? paiseToRupeesString(initial.price) : "", compareAtPrice: paiseToRupeesString(initial.compareAtPrice), sku: initial.sku,
    stock: String(initial.stock), trackInventory: initial.trackInventory, status: initial.status, featured: initial.featured, isGiftable: initial.isGiftable, badge: initial.badge,
    tags: initial.tags.join(", "), categoryId: initial.categoryId ?? "", seoTitle: initial.seoTitle, seoDescription: initial.seoDescription,
  }));
  const [images, setImages] = useState<EditableImage[]>(initial.images);
  const [groups, setGroups] = useState<EditGroup[]>(() => toEditGroups(initial.options));
  const [specs, setSpecs] = useState<(Spec & { key: string })[]>(initial.specs.map((s) => ({ ...s, key: uid() })));
  const [pers, setPers] = useState(() => ({
    enabled: initial.personalization?.enabled ?? false, label: initial.personalization?.label ?? "Name or message on the label",
    maxLength: String(initial.personalization?.maxLength ?? 30), price: paiseToRupeesString(initial.personalization?.price ?? 0) || "0", required: initial.personalization?.required ?? false,
  }));
  const [slugMsg, setSlugMsg] = useState<string | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setDirty(true); setF((s) => ({ ...s, [k]: v })); };
  const wrap = <T,>(fn: (v: T) => void) => (v: T) => { setDirty(true); fn(v); };

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const effectiveSlug = f.slugTouched ? f.slug : slugify(f.name);
  const pricePaise = rupeesToPaise(f.price);

  async function verifySlug() {
    if (!effectiveSlug) return;
    const r = await checkSlug(effectiveSlug, initial.id ?? undefined);
    setSlugMsg(r.available ? null : `Already used. Will save as “${r.suggestion}”.`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 2) errs.name = "Name is required";
    if (pricePaise === null) errs.price = "Enter a price in rupees, e.g. 1299";
    const compare = f.compareAtPrice.trim() ? rupeesToPaise(f.compareAtPrice) : null;
    if (f.compareAtPrice.trim() && compare === null) errs.compareAtPrice = "Enter a valid amount";
    const stock = Number(f.stock);
    if (!Number.isInteger(stock) || stock < 0) errs.stock = "Whole number, 0 or more";
    const options = [];
    for (const g of groups) {
      const values = [];
      for (const v of g.values) {
        const d = signedRupees(v.priceDelta);
        if (d === null) { errs.options = `Price change “${v.priceDelta}” in ${g.name || "an option"} is not a number`; break; }
        if ((g.display === "swatch" || g.display === "candle") && !/^#[0-9a-fA-F]{6}$/.test(v.hex)) { errs.options = `Colour for “${v.label}” must be a hex like #c9a27e`; break; }
        values.push({ id: v.id, label: v.label.trim(), note: v.note?.trim() || null, hex: g.display === "swatch" || g.display === "candle" ? v.hex : null, priceDelta: d, image: v.image || null, available: v.available });
      }
      options.push({ id: g.id, name: g.name.trim(), display: g.display, required: g.required, values });
    }
    const persPrice = rupeesToPaise(pers.price || "0");
    if (pers.enabled && persPrice === null) errs.personalization = "Enter a valid personalisation price";
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.keys(errs).length === 1 ? Object.values(errs)[0] : `Fix ${Object.keys(errs).length} things marked in red`);
      const first = ["name", "price", "compareAtPrice", "stock", "options", "personalization"].find((k) => errs[k]);
      const el = first ? document.getElementById(({ options: "options-panel", personalization: "pers-panel" } as Record<string, string>)[first] ?? first) : null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
      return;
    }

    const input: ProductInput = {
      name: f.name, slug: effectiveSlug, shortDescription: f.shortDescription, description: f.description, price: pricePaise!, compareAtPrice: compare,
      sku: f.sku, stock, trackInventory: f.trackInventory, status: f.status, featured: f.featured, isGiftable: f.isGiftable, badge: f.badge,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), categoryId: f.categoryId || null, images, options,
      specs: specs.filter((s) => s.label.trim() && s.value.trim()).map(({ label, value }) => ({ label, value })),
      personalization: { enabled: pers.enabled, label: pers.label, maxLength: Math.max(1, Math.min(200, Number(pers.maxLength) || 30)), price: persPrice ?? 0, required: pers.required },
      seoTitle: f.seoTitle, seoDescription: f.seoDescription,
    };
    start(async () => {
      const r = await saveProduct(initial.id, input);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        return;
      }
      setDirty(false);
      toast.success(r.message ?? "Saved");
      if (!initial.id && r.data) router.replace(`/admin/products/${r.data.id}`);
      else router.refresh();
    });
  }

  const err = (k: string) => errors[k] && <p className="error-text" role="alert">{errors[k]}</p>;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <Panel title="Details">
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" className="field" autoComplete="off" placeholder="e.g. Oud & Amber jar candle" value={f.name} aria-invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} onBlur={verifySlug} required />
              {err("name")}
            </div>
            <div>
              <label className="label" htmlFor="slug">Web address</label>
              <div className="flex items-center rounded-lg border border-black/[.18] bg-white focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
                <span className="shrink-0 pl-3 text-[16px] text-muted">/product/</span>
                <input id="slug" className="min-h-12 w-full min-w-0 bg-transparent py-3 pr-3 text-[16px] outline-none" autoComplete="off" spellCheck={false} value={effectiveSlug} onChange={(e) => { setDirty(true); setF((s) => ({ ...s, slug: slugify(e.target.value), slugTouched: true })); }} onBlur={verifySlug} />
              </div>
              <p className="hint">{slugMsg ?? "Made from the name. Change it only before sharing the link."}</p>
            </div>
            <div>
              <label className="label" htmlFor="short">Short description</label>
              <input id="short" className="field" maxLength={300} value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="e.g. Smoky resin and warm honey, 40 hours" autoComplete="off" />
              <p className="hint">One line shown under the name.</p>
            </div>
            <MarkdownEditor id="desc" label="Description" value={f.description} onChange={(v) => set("description", v)} rows={10} hint="Use the buttons for headings, bold, lists, links and photos." />
          </div>
        </Panel>

        <Panel title="Images">
          <ImagesEditor images={images} onChange={wrap(setImages)} />
        </Panel>

        <Panel title="Pricing & inventory">
          <div className="grid gap-4 @md:grid-cols-2">
            <div>
              <label className="label" htmlFor="price">Price (₹)</label>
              <input id="price" inputMode="decimal" className="field" value={f.price} aria-invalid={!!errors.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 1299" autoComplete="off" />
              {err("price")}
            </div>
            <div>
              <label className="label" htmlFor="compare">Compare-at price (₹)</label>
              <input id="compare" inputMode="decimal" className="field" value={f.compareAtPrice} aria-invalid={!!errors.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} placeholder="e.g. 1499" autoComplete="off" />
              <p className="hint">Optional. The old price, shown struck through.</p>
              {err("compareAtPrice")}
            </div>
            <div>
              <label className="label" htmlFor="sku">SKU</label>
              <input id="sku" className="field" value={f.sku} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="stock">Stock</label>
              <input id="stock" inputMode="numeric" className="field" disabled={!f.trackInventory} value={f.stock} aria-invalid={!!errors.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} />
              {err("stock")}
            </div>
          </div>
          <div className="mt-3"><Toggle label="Track inventory" hint="When off, the product never sells out (good for made-to-order)." checked={f.trackInventory} onChange={(v) => set("trackInventory", v)} /></div>
        </Panel>

        <Panel id="options-panel" title="Options customers choose" description="Scent, colour, label theme, size… Each value can change the price and the photo shown.">
          <OptionBuilder groups={groups} onChange={wrap(setGroups)} productImages={images.map((i) => i.url)} />
          {err("options")}
        </Panel>

        <Panel id="pers-panel" title="Personalisation">
          <Toggle label="Let customers add their own text" hint="E.g. a name on the label or a message for the card." checked={pers.enabled} onChange={(v) => { setDirty(true); setPers((p) => ({ ...p, enabled: v })); }} />
          {pers.enabled && (
            <div className="mt-3 grid gap-4 @xl:grid-cols-3">
              <div className="@xl:col-span-3">
                <label className="label" htmlFor="p-label">Field label</label>
                <input id="p-label" className="field" value={pers.label} onChange={(e) => { setDirty(true); setPers((p) => ({ ...p, label: e.target.value })); }} />
              </div>
              <div>
                <label className="label" htmlFor="p-max">Max characters</label>
                <input id="p-max" inputMode="numeric" className="field" value={pers.maxLength} onChange={(e) => { setDirty(true); setPers((p) => ({ ...p, maxLength: e.target.value.replace(/\D/g, "") })); }} />
              </div>
              <div>
                <label className="label" htmlFor="p-price">Extra price (₹)</label>
                <input id="p-price" inputMode="decimal" className="field" value={pers.price} onChange={(e) => { setDirty(true); setPers((p) => ({ ...p, price: e.target.value })); }} />
              </div>
              <div className="flex items-end"><Toggle label="Required" checked={pers.required} onChange={(v) => { setDirty(true); setPers((p) => ({ ...p, required: v })); }} /></div>
            </div>
          )}
          {err("personalization")}
        </Panel>

        <Panel title="Specifications" description="Shown as a list on the product page, e.g. Burn time — 40 hours.">
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={s.key} className="flex items-start gap-2">
                <div className="grid min-w-0 flex-1 gap-2 @md:grid-cols-2">
                <input aria-label={`Specification ${i + 1} name`} className="field" autoComplete="off" placeholder="e.g. Burn time" value={s.label} onChange={(e) => { setDirty(true); setSpecs(specs.map((x, k) => (k === i ? { ...x, label: e.target.value } : x))); }} />
                <input aria-label={`Specification ${i + 1} value`} className="field" autoComplete="off" placeholder="e.g. 40 hours" value={s.value} onChange={(e) => { setDirty(true); setSpecs(specs.map((x, k) => (k === i ? { ...x, value: e.target.value } : x))); }} />
                </div>
                <button type="button" aria-label={`Remove specification ${i + 1}`} className="icon-btn is-danger mt-0.5" onClick={() => { setDirty(true); setSpecs(specs.filter((_, k) => k !== i)); }}><Trash2 size={20} aria-hidden /></button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSpecs([...specs, { key: uid(), label: "", value: "" }])}><Plus size={18} aria-hidden /> Add specification</button>
          </div>
        </Panel>

        <Panel title="Search engine listing">
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="seo-t">Page title</label>
              <input id="seo-t" className="field" maxLength={120} value={f.seoTitle} placeholder={f.name} onChange={(e) => set("seoTitle", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="seo-d">Meta description</label>
              <textarea id="seo-d" rows={3} maxLength={300} className="field" value={f.seoDescription} placeholder={f.shortDescription} onChange={(e) => set("seoDescription", e.target.value)} />
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-6 @4xl:sticky @4xl:top-20 @4xl:self-start">
        <Panel title="Publish">
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" className="field" value={f.status} onChange={(e) => set("status", e.target.value as typeof f.status)}>
                <option value="ACTIVE">Active — visible in store</option><option value="DRAFT">Draft — hidden</option><option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <Toggle label="Featured" hint="Shown in “featured” homepage sections" checked={f.featured} onChange={(v) => set("featured", v)} />
            <Toggle label="Giftable" hint="Allow gift wrap and message" checked={f.isGiftable} onChange={(v) => set("isGiftable", v)} />
            {pricePaise !== null && <p className="text-[14px] text-muted">Base price {formatMoney(pricePaise)}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? "Saving…" : initial.id ? "Save changes" : "Create product"}</button>
            {initial.id && f.status === "ACTIVE" && <a className="btn btn-ghost w-full" href={`/product/${effectiveSlug}`} target="_blank" rel="noreferrer"><ExternalLink size={18} aria-hidden />View in store</a>}
          </div>
        </Panel>
        <Panel title="Organise">
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="cat">Category</label>
              <select id="cat" className="field" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">No category</option>
                {categories.filter((c) => !c.parentName).map((c) => {
                  const kids = categories.filter((k) => k.parentName === c.name);
                  return kids.length ? (
                    <optgroup key={c.id} label={c.name}>
                      <option value={c.id}>{c.name} (all)</option>
                      {kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </optgroup>
                  ) : <option key={c.id} value={c.id}>{c.name}</option>;
                })}
              </select>
              <p className="hint">Pick the most specific one. A product in a sub-category also shows in its parent. <a className="underline underline-offset-4" href="/admin/categories" target="_blank" rel="noreferrer">Manage categories</a></p>
            </div>
            <div>
              <label className="label" htmlFor="badge">Badge</label>
              <input id="badge" className="field" autoComplete="off" maxLength={30} placeholder="e.g. Bestseller, New" value={f.badge} onChange={(e) => set("badge", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="tags">Tags</label>
              <input id="tags" className="field" autoComplete="off" placeholder="e.g. soy, jar, festive" value={f.tags} onChange={(e) => set("tags", e.target.value)} aria-describedby="tags-hint" />
              <p id="tags-hint" className="hint">Separate with commas. Used by search.</p>
            </div>
          </div>
        </Panel>
      </div>
      <div className="@4xl:col-span-2">
        <SaveBar dirty={dirty} pending={pending} submit onDiscard={onDiscard} saveLabel={initial.id ? "Save changes" : "Create product"} />
      </div>
    </form>
  );
}
