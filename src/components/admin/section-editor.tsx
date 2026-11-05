"use client";
import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import type { HomeSection, HomeSectionType } from "@/lib/settings-schema";
import { uid, cn } from "@/lib/utils";
import { ImageField } from "./image-field";
import { Toggle } from "./ui";
import { useConfirm } from "./confirm";
import { MarkdownEditor } from "./markdown-field";
import { ProductPicker, type PickableProduct } from "./product-picker";

export type SectionCategory = { slug: string; name: string; parentId: string | null };

export const SECTION_TYPES: { type: HomeSectionType; label: string; help: string }[] = [
  { type: "hero", label: "Hero", help: "The big opening of the homepage: headline, a product on the jar with its price and Buy now, and the pour animation. Active Hero banners replace it as slides." },
  { type: "usp", label: "Promises strip", help: "Short reasons to buy (shipping, materials…)." },
  { type: "categories", label: "Categories", help: "Your visible categories with images." },
  { type: "products", label: "Product shelf", help: "Featured, newest, bestsellers, on sale, or one category." },
  { type: "promo", label: "Promo banner", help: "Shows active Promo banners from Banners & ads." },
  { type: "story", label: "Story", help: "A short letter about the brand with a photo and a button (usually to Our story)." },
  { type: "occasions", label: "Gift occasions", help: "Photo tiles for the sub-categories of one category (Diwali, Wedding, Corporate…)." },
  { type: "membership", label: "Membership", help: "Shows your membership tiers and perks." },
  { type: "reviews", label: "Reviews", help: "Recent real customer reviews (hidden when there are none)." },
  { type: "newsletter", label: "Newsletter signup", help: "Collect emails." },
  { type: "richtext", label: "Text block", help: "A heading and paragraphs." },
];

export function newSection(type: HomeSectionType): HomeSection {
  const id = `${type}-${uid().slice(0, 6)}`;
  switch (type) {
    case "hero": return { id, type, enabled: true, heading: "Archaic Candles", text: "", ctaLabel: "Shop now", ctaHref: "/shop", image: null, productSlug: "", buyNow: true, pour: true };
    case "occasions": return { id, type, enabled: true, heading: "Gifts for the occasion", text: "Boxed, wrapped and ready to give.", categorySlug: "gift-sets" };
    case "usp": return { id, type, enabled: true, items: [{ title: "Hand-poured", text: "Small batches" }] };
    case "categories": return { id, type, enabled: true, heading: "Shop by category", text: "" };
    case "products": return { id, type, enabled: true, heading: "New arrivals", text: "", source: "new", categorySlug: null, limit: 8, layout: "carousel" };
    case "promo": return { id, type, enabled: true };
    case "story": return { id, type, enabled: true, heading: "Our story", text: "", image: null, ctaLabel: "Read our story", ctaHref: "/pages/about" };
    case "membership": return { id, type, enabled: true, heading: "", text: "" };
    case "reviews": return { id, type, enabled: true, heading: "Notes from our customers" };
    case "newsletter": return { id, type, enabled: true, heading: "Letters from the workshop", text: "" };
    case "richtext": return { id, type, enabled: true, heading: "", body: "" };
  }
}

function summary(s: HomeSection) {
  if ("heading" in s && s.heading) return s.heading;
  if (s.type === "usp") return s.items.map((i) => i.title).join(" · ");
  return "";
}

function Text({ label, value, onChange, area, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; placeholder?: string; hint?: string }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>{label}</label>
      {area
        ? <textarea id={id} rows={4} className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-h` : undefined} />
        : <input id={id} className="field" value={value} placeholder={placeholder} autoComplete="off" onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-h` : undefined} />}
      {hint && <p id={`${id}-h`} className="hint">{hint}</p>}
    </div>
  );
}

function Select({ label, value, onChange, children, hint }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; hint?: string }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

/** Two columns from 768 px, one below. Field-to-field gap 16. */
const GRID = "grid gap-4 md:grid-cols-2";

function Fields({ s, set, categories, products }: { s: HomeSection; set: (patch: Partial<HomeSection>) => void; categories: SectionCategory[]; products: PickableProduct[] }) {
  switch (s.type) {
    case "hero":
      return (
        <div className="space-y-8">
          <div className={GRID}>
            <div className="md:col-span-2"><Text label="Headline" value={s.heading} onChange={(v) => set({ heading: v })} placeholder="e.g. Choose your scent. We pour it." /></div>
            <div className="md:col-span-2"><Text area label="Supporting text" value={s.text} onChange={(v) => set({ text: v })} hint="One or two short sentences under the headline." /></div>
            <Text label="Button text" value={s.ctaLabel} onChange={(v) => set({ ctaLabel: v })} placeholder="e.g. Shop the candles" />
            <Text label="Button goes to" value={s.ctaHref} onChange={(v) => set({ ctaHref: v })} placeholder="/shop" hint="A page on your store, like /shop or /pages/about." />
          </div>
          <div className="space-y-4 border-t border-black/10 pt-6">
            <ProductPicker label="Product on the hero jar" value={s.productSlug} onChange={(v) => set({ productSlug: v })} products={products} noneLabel="None — headline only" hint="Shows this product's photo, name and price beside the headline. Only active products are listed." />
            <div className="grid gap-x-6 md:grid-cols-2">
              <Toggle label="Show a Buy now button" hint="Adds the product to the bag and opens checkout in one tap." checked={s.buyNow} onChange={(v) => set({ buyNow: v })} />
              <Toggle label="Pour animation" hint="Wax pours into the jar as the visitor scrolls. Turn off for a still jar." checked={s.pour} onChange={(v) => set({ pour: v })} />
            </div>
            {!s.productSlug && (s.buyNow || s.pour) && <p className="hint">Buy now and the pour animation need a product. Pick one above, or they are skipped.</p>}
          </div>
          <div className="border-t border-black/10 pt-6">
            <ImageField label="Hero photo (optional)" value={s.image} onChange={(v) => set({ image: v })} hint="Shown in the hero when no Hero banners are active. Wide photos work best, about 1600 × 1000 px." />
          </div>
        </div>
      );
    case "occasions": {
      const tops = categories.filter((c) => !c.parentId);
      const known = tops.some((c) => c.slug === s.categorySlug);
      return (
        <div className={GRID}>
          <div className="md:col-span-2">
            <Select label="Category whose sub-categories become tiles" value={s.categorySlug} onChange={(v) => set({ categorySlug: v })} hint="Each sub-category shows as a photo tile. Add sub-categories and their photos in Categories.">
              {!known && <option value={s.categorySlug}>{s.categorySlug ? `“${s.categorySlug}” (not found)` : "Choose a category…"}</option>}
              {tops.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </Select>
          </div>
          <Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} placeholder="e.g. Gifts for the occasion" />
          <Text label="Text under the heading" value={s.text} onChange={(v) => set({ text: v })} placeholder="e.g. Boxed, wrapped and ready to give." />
        </div>
      );
    }
    case "usp":
      return (
        <div className="space-y-4">
          {s.items.map((it, i) => (
            <fieldset key={i} className="rounded-lg border border-black/10 p-4">
              <legend className="px-1 text-[14px] font-semibold">Promise {i + 1}</legend>
              <div className="grid gap-4 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
                <Text label="Title" value={it.title} onChange={(v) => set({ items: s.items.map((x, k) => (k === i ? { ...x, title: v } : x)) })} placeholder="e.g. Hand-poured" />
                <Text label="Text" value={it.text} onChange={(v) => set({ items: s.items.map((x, k) => (k === i ? { ...x, text: v } : x)) })} placeholder="e.g. Small batches of forty" />
                <button type="button" className="text-btn is-danger justify-self-start" onClick={() => set({ items: s.items.filter((_, k) => k !== i) })}><Trash2 size={18} aria-hidden />Remove</button>
              </div>
            </fieldset>
          ))}
          {s.items.length < 6 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ items: [...s.items, { title: "", text: "" }] })}><Plus size={18} aria-hidden />Add promise</button>}
        </div>
      );
    case "categories":
      return <div className={GRID}><Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} /><Text label="Text under the heading" value={s.text} onChange={(v) => set({ text: v })} /></div>;
    case "products":
      return (
        <div className={GRID}>
          <Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} />
          <Text label="Text under the heading" value={s.text} onChange={(v) => set({ text: v })} />
          <Select label="Products to show" value={s.source} onChange={(v) => set({ source: v as typeof s.source })}>
            <option value="featured">Featured products</option><option value="new">Newest</option><option value="bestsellers">Bestsellers</option><option value="sale">On sale</option><option value="category">One category</option>
          </Select>
          {s.source === "category" && (
            <Select label="Category" value={s.categorySlug ?? ""} onChange={(v) => set({ categorySlug: v || null })}>
              <option value="">Choose…</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.parentId ? `— ${c.name}` : c.name}</option>)}
            </Select>
          )}
          <Text label="How many products" value={String(s.limit)} onChange={(v) => set({ limit: Math.max(2, Math.min(24, Number(v.replace(/\D/g, "")) || 8)) })} hint="Between 2 and 24." />
          <Select label="Layout" value={s.layout} onChange={(v) => set({ layout: v as "grid" | "carousel" })}><option value="carousel">Swipe row</option><option value="grid">Grid</option></Select>
        </div>
      );
    case "promo":
      return <p className="text-[15px]">Shows your active Promo banners. Manage them in <a className="underline underline-offset-4" href="/admin/banners">Banners & ads</a>.</p>;
    case "story":
      return (
        <div className="space-y-4">
          <Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} placeholder="e.g. Why archaic" />
          <Text area label="Text" value={s.text} onChange={(v) => set({ text: v })} hint="A short paragraph. The full story lives on the Our story page." />
          <ImageField label="Photo" value={s.image} onChange={(v) => set({ image: v })} aspect="4/3" hint="A workshop or hands-at-work photo. About 1200 × 900 px." />
          <div className={GRID}>
            <Text label="Button text" value={s.ctaLabel} onChange={(v) => set({ ctaLabel: v })} placeholder="e.g. Read our story" hint="Leave empty for no button." />
            <Text label="Button goes to" value={s.ctaHref} onChange={(v) => set({ ctaHref: v })} placeholder="/pages/about" />
          </div>
          <p className="text-[15px]">Edit the full story page in <a className="underline underline-offset-4" href="/admin/pages?edit=about#page-form">Pages → Our story</a>.</p>
        </div>
      );
    case "membership":
      return <div className={GRID}><Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} hint="Leave empty to use the programme name." /><Text label="Text under the heading" value={s.text} onChange={(v) => set({ text: v })} /><p className="hint md:col-span-2">Tiers and perks are set in Settings → Membership.</p></div>;
    case "reviews":
      return <Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} />;
    case "newsletter":
      return <div className={GRID}><Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} /><Text label="Text under the heading" value={s.text} onChange={(v) => set({ text: v })} /></div>;
    case "richtext":
      return <div className="space-y-4"><Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} /><MarkdownEditor label="Text" value={s.body} onChange={(v) => set({ body: v })} rows={8} /></div>;
  }
}

export function SectionsEditor({ sections, onChange, categories, products }: { sections: HomeSection[]; onChange: (s: HomeSection[]) => void; categories: SectionCategory[]; products: PickableProduct[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const confirm = useConfirm();
  const update = (i: number, patch: Partial<HomeSection>) => onChange(sections.map((s, k) => (k === i ? ({ ...s, ...patch } as HomeSection) : s)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= sections.length) return;
    const n = [...sections];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <div className="space-y-3">
      {sections.map((s, i) => {
        const meta = SECTION_TYPES.find((t) => t.type === s.type);
        const isOpen = open === s.id;
        return (
          <div key={s.id} className={cn("rounded-lg border bg-surface", isOpen ? "border-black/25" : "border-black/10")}>
            <div className="flex items-center gap-1 py-1 pl-1 pr-1">
              <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center" title={s.enabled ? "Shown on the homepage" : "Hidden"}>
                <input type="checkbox" aria-label={`Show ${meta?.label} on the homepage`} className="h-5 w-5 accent-[var(--accent)]" checked={s.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
              </label>
              <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[15px] font-semibold", !s.enabled && "text-muted")}>{meta?.label}{!s.enabled && <span className="font-normal"> · hidden</span>}</span>
                  {summary(s) && <span className="block truncate text-[14px] text-muted">{summary(s)}</span>}
                </span>
                <ChevronDown size={20} aria-hidden className={cn("shrink-0 transition-transform", isOpen && "rotate-180")} />
              </button>
              <button type="button" aria-label={`Move ${meta?.label} up`} className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={20} aria-hidden /></button>
              <button type="button" aria-label={`Move ${meta?.label} down`} className="icon-btn" disabled={i === sections.length - 1} onClick={() => move(i, 1)}><ArrowDown size={20} aria-hidden /></button>
            </div>
            {isOpen && (
              <div className="border-t border-black/10 p-4 md:p-5">
                <p className="mb-4 text-[14px] leading-5 text-muted">{meta?.help}</p>
                <Fields s={s} set={(p) => update(i, p)} categories={categories} products={products} />
                <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-4">
                  <button type="button" className="text-btn" onClick={() => { const c = { ...structuredClone(s), id: `${s.type}-${uid().slice(0, 6)}` }; onChange([...sections.slice(0, i + 1), c, ...sections.slice(i + 1)]); setOpen(c.id); }}><Copy size={18} aria-hidden />Duplicate section</button>
                  <button type="button" className="text-btn is-danger" onClick={async () => { if (await confirm({ title: `Remove the ${meta?.label} section?`, body: "It disappears from the homepage when you save. To hide it for now, untick it instead.", confirmLabel: "Remove section", danger: true })) onChange(sections.filter((_, k) => k !== i)); }}><Trash2 size={18} aria-hidden />Remove section</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div>
        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={adding} onClick={() => setAdding((a) => !a)}><Plus size={18} aria-hidden />Add section</button>
        {adding && (
          <ul className="mt-2 grid gap-2 rounded-lg border border-black/10 bg-surface p-2 sm:grid-cols-2">
            {SECTION_TYPES.map((t) => (
              <li key={t.type}>
                <button type="button" className="min-h-11 w-full rounded-md px-3 py-2 text-left hover:bg-black/5" onClick={() => { const n = newSection(t.type); onChange([...sections, n]); setOpen(n.id); setAdding(false); }}>
                  <span className="block text-[15px] font-semibold">{t.label}</span><span className="mt-1 block text-[14px] leading-5 text-muted">{t.help}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
