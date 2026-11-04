"use client";
import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import type { HomeSection, HomeSectionType } from "@/lib/settings-schema";
import { uid, cn } from "@/lib/utils";
import { ImageField } from "./image-field";

export const SECTION_TYPES: { type: HomeSectionType; label: string; help: string }[] = [
  { type: "hero", label: "Hero", help: "Big opening. Uses active Hero banners as slides; falls back to the text here." },
  { type: "usp", label: "Promises strip", help: "Short reasons to buy (shipping, materials…)." },
  { type: "categories", label: "Categories", help: "Your visible categories with images." },
  { type: "products", label: "Product shelf", help: "Featured, newest, bestsellers, on sale, or one category." },
  { type: "promo", label: "Promo banner", help: "Shows active Promo banners from Banners & ads." },
  { type: "story", label: "Story", help: "A short letter about the brand with an image." },
  { type: "membership", label: "Membership", help: "Shows your membership tiers and perks." },
  { type: "reviews", label: "Reviews", help: "Recent real customer reviews (hidden when there are none)." },
  { type: "newsletter", label: "Newsletter signup", help: "Collect emails." },
  { type: "richtext", label: "Text block", help: "A heading and paragraphs (markdown)." },
];

export function newSection(type: HomeSectionType): HomeSection {
  const id = `${type}-${uid().slice(0, 6)}`;
  switch (type) {
    case "hero": return { id, type, enabled: true, heading: "Archaic Candles", text: "", ctaLabel: "Shop now", ctaHref: "/shop", image: null };
    case "usp": return { id, type, enabled: true, items: [{ title: "Hand-poured", text: "Small batches" }] };
    case "categories": return { id, type, enabled: true, heading: "Shop by category", text: "" };
    case "products": return { id, type, enabled: true, heading: "New arrivals", text: "", source: "new", categorySlug: null, limit: 8, layout: "carousel" };
    case "promo": return { id, type, enabled: true };
    case "story": return { id, type, enabled: true, heading: "Our story", text: "", image: null, ctaLabel: "", ctaHref: "" };
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

function Text({ label, value, onChange, area, placeholder }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; placeholder?: string }) {
  const id = useId();
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {area ? <textarea id={id} rows={4} className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /> : <input id={id} className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

function Fields({ s, set, categories }: { s: HomeSection; set: (patch: Partial<HomeSection>) => void; categories: { slug: string; name: string }[] }) {
  switch (s.type) {
    case "hero":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <p className="hint md:col-span-2">If you have active Hero banners, they are used as slides. These fields are the fallback.</p>
          <Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} />
          <Text label="Supporting text" value={s.text} onChange={(v) => set({ text: v })} />
          <Text label="Button label" value={s.ctaLabel} onChange={(v) => set({ ctaLabel: v })} />
          <Text label="Button link" value={s.ctaHref} onChange={(v) => set({ ctaHref: v })} placeholder="/shop" />
          <div className="md:col-span-2"><ImageField label="Image" value={s.image} onChange={(v) => set({ image: v })} /></div>
        </div>
      );
    case "usp":
      return (
        <div className="space-y-2">
          {s.items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
              <input aria-label="Title" className="field !min-h-[40px] !py-2" value={it.title} onChange={(e) => set({ items: s.items.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)) })} />
              <input aria-label="Text" className="field !min-h-[40px] !py-2" value={it.text} onChange={(e) => set({ items: s.items.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)) })} />
              <button type="button" aria-label="Remove" className="rounded p-2 text-sale hover:bg-red-50" onClick={() => set({ items: s.items.filter((_, k) => k !== i) })}><Trash2 size={15} /></button>
            </div>
          ))}
          {s.items.length < 6 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ items: [...s.items, { title: "", text: "" }] })}><Plus size={15} />Add promise</button>}
        </div>
      );
    case "categories":
      return <div className="grid gap-3 md:grid-cols-2"><Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} /><Text label="Text" value={s.text} onChange={(v) => set({ text: v })} /></div>;
    case "products":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} />
          <Text label="Text" value={s.text} onChange={(v) => set({ text: v })} />
          <div>
            <label className="label" htmlFor={`src-${s.id}`}>Products to show</label>
            <select id={`src-${s.id}`} className="field" value={s.source} onChange={(e) => set({ source: e.target.value as typeof s.source })}>
              <option value="featured">Featured products</option><option value="new">Newest</option><option value="bestsellers">Bestsellers</option><option value="sale">On sale</option><option value="category">One category</option>
            </select>
          </div>
          {s.source === "category" && (
            <div>
              <label className="label" htmlFor={`cat-${s.id}`}>Category</label>
              <select id={`cat-${s.id}`} className="field" value={s.categorySlug ?? ""} onChange={(e) => set({ categorySlug: e.target.value || null })}>
                <option value="">Choose…</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div><label className="label" htmlFor={`lim-${s.id}`}>How many</label><input id={`lim-${s.id}`} type="number" min={2} max={24} className="field" value={s.limit} onChange={(e) => set({ limit: Math.max(2, Math.min(24, Number(e.target.value) || 8)) })} /></div>
          <div>
            <label className="label" htmlFor={`lay-${s.id}`}>Layout</label>
            <select id={`lay-${s.id}`} className="field" value={s.layout} onChange={(e) => set({ layout: e.target.value as "grid" | "carousel" })}><option value="carousel">Swipe row</option><option value="grid">Grid</option></select>
          </div>
        </div>
      );
    case "promo":
      return <p className="hint">Shows your active Promo banners. Manage them in <a className="underline" href="/admin/banners">Banners & ads</a>.</p>;
    case "story":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} />
          <ImageField label="Image" value={s.image} onChange={(v) => set({ image: v })} />
          <div className="md:col-span-2"><Text area label="Text" value={s.text} onChange={(v) => set({ text: v })} /></div>
          <Text label="Button label" value={s.ctaLabel} onChange={(v) => set({ ctaLabel: v })} />
          <Text label="Button link" value={s.ctaHref} onChange={(v) => set({ ctaHref: v })} placeholder="/pages/about" />
        </div>
      );
    case "membership":
      return <div className="grid gap-3 md:grid-cols-2"><Text label="Heading (blank = programme name)" value={s.heading} onChange={(v) => set({ heading: v })} /><Text label="Text" value={s.text} onChange={(v) => set({ text: v })} /><p className="hint md:col-span-2">Tiers come from Settings → Membership.</p></div>;
    case "reviews":
      return <Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} />;
    case "newsletter":
      return <div className="grid gap-3 md:grid-cols-2"><Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} /><Text label="Text" value={s.text} onChange={(v) => set({ text: v })} /></div>;
    case "richtext":
      return <div className="space-y-3"><Text label="Heading" value={s.heading} onChange={(v) => set({ heading: v })} /><Text area label="Body (markdown)" value={s.body} onChange={(v) => set({ body: v })} /></div>;
  }
}

export function SectionsEditor({ sections, onChange, categories }: { sections: HomeSection[]; onChange: (s: HomeSection[]) => void; categories: { slug: string; name: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const update = (i: number, patch: Partial<HomeSection>) => onChange(sections.map((s, k) => (k === i ? ({ ...s, ...patch } as HomeSection) : s)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= sections.length) return;
    const n = [...sections];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <div className="space-y-2">
      {sections.map((s, i) => {
        const meta = SECTION_TYPES.find((t) => t.type === s.type);
        const isOpen = open === s.id;
        return (
          <div key={s.id} className={cn("rounded-lg border border-black/10 bg-surface", !s.enabled && "opacity-70")}>
            <div className="flex items-center gap-2 p-2 pl-3">
              <input type="checkbox" aria-label={`Show ${meta?.label}`} className="h-5 w-5 shrink-0 accent-[var(--accent)]" checked={s.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
              <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}>
                <span className="text-[14px] font-semibold">{meta?.label}</span>
                <span className="truncate text-[13px] text-muted">{summary(s)}</span>
                <ChevronDown size={16} className={cn("ml-auto shrink-0 transition-transform", isOpen && "rotate-180")} />
              </button>
              <button type="button" aria-label="Move up" className="rounded p-1.5 hover:bg-black/5 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
              <button type="button" aria-label="Move down" className="rounded p-1.5 hover:bg-black/5 disabled:opacity-30" disabled={i === sections.length - 1} onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
              <button type="button" aria-label="Duplicate" className="hidden rounded p-1.5 hover:bg-black/5 sm:block" onClick={() => { const c = { ...structuredClone(s), id: `${s.type}-${uid().slice(0, 6)}` }; onChange([...sections.slice(0, i + 1), c, ...sections.slice(i + 1)]); }}><Copy size={15} /></button>
              <button type="button" aria-label="Delete section" className="rounded p-1.5 text-sale hover:bg-red-50" onClick={() => confirm(`Remove the ${meta?.label} section?`) && onChange(sections.filter((_, k) => k !== i))}><Trash2 size={15} /></button>
            </div>
            {isOpen && <div className="border-t border-black/10 p-3 md:p-4"><p className="mb-3 text-[13px] text-muted">{meta?.help}</p><Fields s={s} set={(p) => update(i, p)} categories={categories} /></div>}
          </div>
        );
      })}
      <div className="relative">
        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={adding} onClick={() => setAdding((a) => !a)}><Plus size={15} />Add section</button>
        {adding && (
          <ul className="absolute z-20 mt-1 w-[min(92vw,360px)] rounded-lg border border-black/10 bg-surface p-1 shadow-lg">
            {SECTION_TYPES.map((t) => (
              <li key={t.type}>
                <button type="button" className="w-full rounded-md px-3 py-2 text-left hover:bg-black/5" onClick={() => { const n = newSection(t.type); onChange([...sections, n]); setOpen(n.id); setAdding(false); }}>
                  <span className="block text-[14px] font-semibold">{t.label}</span><span className="block text-[12px] text-muted">{t.help}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
