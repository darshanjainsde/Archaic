"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveSettingsParts } from "@/actions/admin/settings";
import { Img } from "@/components/ui/img";
import { formatMoney, paiseToRupeesString, rupeesToPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { BOX_SHAPE_LABEL, BOX_SHAPES, FINISH_PATTERNS, boxSettingsSchema, type BoxSettings, type BoxShape, type DecorOption } from "@/lib/box/schema";
import { EditorTabs } from "./editor-tabs";
import { SaveBar } from "./save-bar";
import { Panel, Toggle } from "./ui";
import { uploadFiles } from "./upload";
import { useConfirm } from "./confirm";
import type { PickableProduct } from "./product-picker";

type Tab = "general" | "sizes" | "decor" | "inside" | "card" | "own";
const TABS: [Tab, string][] = [["inside", "What goes inside"], ["sizes", "Box sizes"], ["decor", "Decorations"], ["card", "Card & seal"], ["own", "Your own gift"], ["general", "General"]];
const nid = () => Math.random().toString(36).slice(2, 9);
const PATTERN_LABEL: Record<(typeof FINISH_PATTERNS)[number], string> = { kraft: "Kraft paper", marbled: "Marbled", blockprint: "Block print", foil: "Foil dots", wood: "Wood", plain: "Plain colour" };

/* ---------------- small fields ---------------- */

function Rupees({ id, label, value, onChange, hint }: { id: string; label: string; value: number; onChange: (paise: number) => void; hint?: string }) {
  const [text, setText] = useState(value ? paiseToRupeesString(value) : "0");
  const bad = rupeesToPaise(text || "0") === null;
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
        <input id={id} inputMode="decimal" autoComplete="off" aria-invalid={bad} className="field !pl-8 tabular-nums" value={text}
          onChange={(e) => { setText(e.target.value); const p = rupeesToPaise(e.target.value || "0"); if (p !== null) onChange(p); }} />
      </div>
      {bad ? <p className="error-text">Use a number like 149 or 149.50</p> : hint && <p className="hint">{hint}</p>}
    </div>
  );
}
function Num({ id, label, value, onChange, min, max, step = 1, suffix, hint }: { id: string; label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; suffix?: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} className="field tabular-nums" value={value}
          onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n))); }} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">{suffix}</span>}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
function Text({ id, label, value, onChange, max, placeholder, hint, area }: { id: string; label: string; value: string; onChange: (v: string) => void; max: number; placeholder?: string; hint?: string; area?: boolean }) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>{label}</label>
      {area ? <textarea id={id} className="field min-h-24" maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input id={id} className="field" maxLength={max} value={value} placeholder={placeholder} autoComplete="off" onChange={(e) => onChange(e.target.value)} />}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
function Colour({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} className="h-12 w-12 shrink-0 cursor-pointer rounded-lg border border-black/15 bg-white p-1" value={value} onChange={(e) => onChange(e.target.value)} />
        <input id={id} className="field min-w-0 uppercase" maxLength={7} spellCheck={false} value={value} onChange={(e) => { const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v); }} />
      </div>
    </div>
  );
}
function ShapeSelect({ id, value, onChange }: { id: string; value: BoxShape; onChange: (v: BoxShape) => void }) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>Drawn in 3D as</label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value as BoxShape)}>
        {BOX_SHAPES.map((s) => <option key={s} value={s}>{BOX_SHAPE_LABEL[s]}</option>)}
      </select>
    </div>
  );
}
/** Tap the bottom-right corner of the space an item takes (up to 4 × 4). */
function Footprint({ w, h, onChange, label = "Space it takes in the box" }: { w: number; h: number; onChange: (w: number, h: number) => void; label?: string }) {
  return (
    <div className="min-w-0">
      <p className="label">{label}: <span className="tabular-nums">{w} × {h}</span></p>
      <div className="grid w-max grid-cols-4 gap-1" role="group" aria-label={`${label}. Tap a square to set the width and depth.`}>
        {Array.from({ length: 16 }, (_, i) => {
          const x = (i % 4) + 1, y = Math.floor(i / 4) + 1, on = x <= w && y <= h;
          return <button key={i} type="button" aria-label={`${x} by ${y}`} aria-pressed={x === w && y === h} onClick={() => onChange(x, y)} className={cn("h-11 w-11 rounded-md border", on ? "border-[#a8783f] bg-[#c49a62]" : "border-black/10 bg-[#efe8dc] hover:bg-[#e6dccb]")} />;
        })}
      </div>
    </div>
  );
}
function Photo({ value, onChange, label }: { value: string | null | undefined; onChange: (v: string | null) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-black/25 bg-[#efe8dc] text-center text-[12px] text-muted" aria-label={value ? `Change photo for ${label}` : `Add a photo for ${label}`}>
        {value ? <Img src={value} alt="" fill sizes="80px" className="object-cover" /> : busy ? "Uploading…" : <span className="grid justify-items-center gap-1"><ImagePlus size={18} aria-hidden />Photo</span>}
      </button>
      {value && <button type="button" className="text-btn is-danger !min-h-9 !px-1 !text-[13px]" onClick={() => onChange(null)}>Remove</button>}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
        setBusy(true);
        try { const [url] = await uploadFiles([f]); onChange(url); } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); } finally { setBusy(false); }
      }} />
    </div>
  );
}
function RowTools({ i, n, onMove, onRemove, removeLabel }: { i: number; n: number; onMove: (to: number) => void; onRemove?: () => void; removeLabel: string }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => onMove(i - 1)}><ArrowUp size={18} aria-hidden /></button>
      <button type="button" className="icon-btn" aria-label="Move down" disabled={i === n - 1} onClick={() => onMove(i + 1)}><ArrowDown size={18} aria-hidden /></button>
      {onRemove && <button type="button" className="icon-btn is-danger" aria-label={removeLabel} onClick={onRemove}><Trash2 size={18} aria-hidden /></button>}
    </div>
  );
}
const moved = <T,>(list: T[], from: number, to: number) => { const a = [...list]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };

/* ---------------- decoration list ---------------- */

function DecorList({ title, description, list, onChange, withPattern, min = 1, addLabel }: { title: string; description: string; list: DecorOption[]; onChange: (l: DecorOption[]) => void; withPattern?: boolean; min?: number; addLabel: string }) {
  const set = (i: number, patch: Partial<DecorOption>) => onChange(list.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  return (
    <Panel title={title} description={description}>
      <ul className="space-y-3">
        {list.map((d, i) => (
          <li key={d.id} className="@container rounded-lg border border-black/10 bg-bg/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex-1 text-[15px] font-semibold">{d.name || "Untitled"}{i === 0 && <span className="ml-2 text-[13px] font-normal text-muted">shown first</span>}</span>
              <RowTools i={i} n={list.length} onMove={(to) => onChange(moved(list, i, to))} onRemove={list.length > min ? () => onChange(list.filter((_, k) => k !== i)) : undefined} removeLabel={`Remove ${d.name}`} />
            </div>
            <div className="grid gap-4 @lg:grid-cols-[auto_minmax(0,1fr)]">
              <Photo value={d.image} onChange={(v) => set(i, { image: v })} label={d.name} />
              <div className="grid gap-4 @md:grid-cols-2">
                <Text id={`${d.id}-n`} label="Name" value={d.name} max={40} onChange={(v) => set(i, { name: v })} />
                <Rupees id={`${d.id}-p`} label="Price" value={d.price} onChange={(v) => set(i, { price: v })} hint={d.price ? undefined : "0 = included in the box price"} />
                <Colour id={`${d.id}-c`} label="Colour" value={d.color} onChange={(v) => set(i, { color: v })} />
                {withPattern && (
                  <div className="min-w-0">
                    <label className="label" htmlFor={`${d.id}-pt`}>Pattern without a photo</label>
                    <select id={`${d.id}-pt`} className="field" value={d.pattern} onChange={(e) => set(i, { pattern: e.target.value as DecorOption["pattern"] })}>{FINISH_PATTERNS.map((p) => <option key={p} value={p}>{PATTERN_LABEL[p]}</option>)}</select>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2"><Toggle label="Offered" checked={d.enabled} onChange={(v) => set(i, { enabled: v })} /></div>
          </li>
        ))}
      </ul>
      {list.length < 12 && <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => onChange([...list, { id: nid(), name: "", price: 0, color: "#c49a62", image: null, pattern: "plain", enabled: true }])}><Plus size={18} aria-hidden /> {addLabel}</button>}
    </Panel>
  );
}

/* ---------------- main editor ---------------- */

export function BoxesEditor({ initial, products, categories, initialTab }: { initial: BoxSettings; products: PickableProduct[]; categories: { slug: string; name: string; parentName: string | null }[]; initialTab?: Tab }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [b, setB] = useState<BoxSettings>(initial);
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t[0] === initialTab) ? initialTab! : "inside");
  const [catId, setCatId] = useState(initial.categories[0]?.id ?? "");
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [ver, setVer] = useState(0); // remounts money fields after a discard
  const up = (patch: Partial<BoxSettings>) => { setB((x) => ({ ...x, ...patch })); setDirty(true); };

  function save() {
    const r = boxSettingsSchema.safeParse(b);
    if (!r.success) {
      const i = r.error.issues[0];
      const where = i.path.join(" › ").replace(/\b(\d+)\b/g, (n) => String(Number(n) + 1));
      toast.error(`Check ${where}: ${i.message}`);
      return;
    }
    for (const c of r.data.categories) if (c.kind === "products" && !c.categorySlug && !c.products.length) { setTab("inside"); setCatId(c.id); toast.error(`“${c.name}”: choose a shop category or add products.`); return; }
    start(async () => {
      const res = await saveSettingsParts({ boxes: r.data });
      if (res.ok) { setDirty(false); toast.success("Saved. The box builder is updated."); router.refresh(); }
      else toast.error(res.error);
    });
  }

  const cat = b.categories.find((c) => c.id === catId) ?? b.categories[0];
  const setCat = (patch: Partial<BoxSettings["categories"][number]>) => up({ categories: b.categories.map((c) => (c.id === cat.id ? { ...c, ...patch } : c)) });

  return (
    <div key={ver}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className={cn("rounded-full px-3 py-1 text-[13px] font-semibold", b.enabled ? "bg-emerald-100 text-emerald-900" : "bg-neutral-200 text-neutral-700")}>{b.enabled ? "Live on the store" : "Switched off"}</span>
        <a href="/build-a-box" target="_blank" rel="noreferrer" className="text-btn"><ExternalLink size={16} aria-hidden /> Open the builder</a>
      </div>
      <EditorTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "inside" && (
        <div className="grid gap-6 @4xl:grid-cols-[300px_minmax(0,1fr)] @4xl:items-start">
          <Panel title="Categories" description="Tabs customers see in the Fill step, in this order.">
            <ul className="space-y-2">
              {b.categories.map((c, i) => (
                <li key={c.id} className={cn("flex items-center gap-1 rounded-lg border p-1 pl-3", c.id === cat?.id ? "border-ink ring-1 ring-ink" : "border-black/10")}>
                  <button type="button" className="min-h-11 min-w-0 flex-1 text-left" onClick={() => setCatId(c.id)} aria-current={c.id === cat?.id}>
                    <b className="block truncate text-[15px]">{c.name || "Untitled"}</b>
                    <span className="text-[13px] text-muted">{c.kind === "products" ? "From your shop" : `${c.options.length} option${c.options.length === 1 ? "" : "s"}`}{c.enabled ? "" : " · hidden"}</span>
                  </button>
                  <RowTools i={i} n={b.categories.length} onMove={(to) => up({ categories: moved(b.categories, i, to) })} removeLabel="" />
                </li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const c = { id: nid(), name: "", kind: "custom" as const, categorySlug: "", products: [], fallback: { w: 1, h: 1, heightCm: 7, shape: "jar" as const }, options: [{ id: nid(), name: "", price: 0, image: null, w: 1, h: 1, heightCm: 6, shape: "block" as const, color: "#c49a62", details: [], enabled: true }], enabled: true }; up({ categories: [...b.categories, c] }); setCatId(c.id); }}><Plus size={18} aria-hidden /> New category (e.g. Idols)</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const c = { id: nid(), name: "Shop products", kind: "products" as const, categorySlug: "", products: [], fallback: { w: 1, h: 1, heightCm: 7, shape: "jar" as const }, options: [], enabled: true }; up({ categories: [...b.categories, c] }); setCatId(c.id); }}><Plus size={18} aria-hidden /> Category from shop products</button>
            </div>
          </Panel>

          {cat ? (
            <Panel title={cat.kind === "products" ? "Products from your shop" : "Options you add here"} description={cat.kind === "products" ? "Price, stock, photos and choices (jar, scent, name on label) come from the product itself. Here you set how much space each takes." : "Each option needs a name, a price and the space it takes. Size, weight or material are optional details."}>
              <div className="grid gap-4 @md:grid-cols-2">
                <Text id="cat-name" label="Category name" value={cat.name} max={40} onChange={(v) => setCat({ name: v })} placeholder="e.g. Idols" hint="Shown as a tab in the Fill step." />
                <div className="flex items-end"><Toggle label="Show in the builder" checked={cat.enabled} onChange={(v) => setCat({ enabled: v })} /></div>
              </div>

              {cat.kind === "products" ? (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 @md:grid-cols-2">
                    <div className="min-w-0">
                      <label className="label" htmlFor="cat-src">Every active product in</label>
                      <select id="cat-src" className="field" value={cat.categorySlug} onChange={(e) => setCat({ categorySlug: e.target.value })}>
                        <option value="">No shop category: only the products below</option>
                        {categories.map((c) => <option key={c.slug} value={c.slug}>{c.parentName ? `— ${c.name}` : c.name}</option>)}
                      </select>
                      <p className="hint">New products in this category appear in the builder automatically.</p>
                    </div>
                  </div>
                  <fieldset className="rounded-lg border border-black/10 p-4">
                    <legend className="px-1 text-[14px] font-semibold">For products without their own line below</legend>
                    <div className="grid gap-4 @xl:grid-cols-[auto_minmax(0,1fr)]">
                      <Footprint w={cat.fallback.w} h={cat.fallback.h} onChange={(w, h) => setCat({ fallback: { ...cat.fallback, w, h } })} />
                      <div className="grid gap-4 @md:grid-cols-2">
                        <ShapeSelect id="fb-shape" value={cat.fallback.shape} onChange={(v) => setCat({ fallback: { ...cat.fallback, shape: v } })} />
                        <Num id="fb-h" label="Height" value={cat.fallback.heightCm} min={0.5} max={30} step={0.5} suffix="cm" onChange={(v) => setCat({ fallback: { ...cat.fallback, heightCm: v } })} />
                      </div>
                    </div>
                  </fieldset>
                  <div>
                    <h3 className="text-[15px] font-semibold">Products with their own space</h3>
                    <p className="hint mb-3">Add a product to give it a different space or shape (a glass dome takes 2 × 2), to add one from outside the category, or to hide one.</p>
                    <ul className="space-y-3">
                      {cat.products.map((pf, i) => {
                        const pr = products.find((p) => p.slug === pf.slug);
                        const setP = (patch: Partial<typeof pf>) => setCat({ products: cat.products.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
                        return (
                          <li key={pf.slug} className="@container rounded-lg border border-black/10 bg-bg/50 p-4">
                            <div className="mb-3 flex items-center gap-3">
                              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-field"><Img src={pr?.image} alt="" fill sizes="48px" className="object-cover" /></span>
                              <span className="min-w-0 flex-1"><b className="block truncate text-[15px]">{pr?.name ?? pf.slug}</b><span className="text-[13px] text-muted">{pr ? formatMoney(pr.price) : "Not an active product"}</span></span>
                              <button type="button" className="icon-btn is-danger" aria-label={`Remove ${pr?.name ?? pf.slug}`} onClick={() => setCat({ products: cat.products.filter((_, k) => k !== i) })}><Trash2 size={18} aria-hidden /></button>
                            </div>
                            <div className="grid gap-4 @xl:grid-cols-[auto_minmax(0,1fr)]">
                              <Footprint w={pf.w} h={pf.h} onChange={(w, h) => setP({ w, h })} />
                              <div className="grid content-start gap-4 @md:grid-cols-2">
                                <ShapeSelect id={`pf-s-${i}`} value={pf.shape} onChange={(v) => setP({ shape: v })} />
                                <Num id={`pf-h-${i}`} label="Height" value={pf.heightCm} min={0.5} max={30} step={0.5} suffix="cm" onChange={(v) => setP({ heightCm: v })} />
                                <div className="@md:col-span-2"><Toggle label="Can go in a box" checked={pf.enabled} onChange={(v) => setP({ enabled: v })} /></div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-3 max-w-md">
                      <label className="label" htmlFor="pf-add">Add a product</label>
                      <select id="pf-add" className="field" value="" onChange={(e) => { const slug = e.target.value; if (!slug || cat.products.some((p) => p.slug === slug)) return; setCat({ products: [...cat.products, { slug, ...cat.fallback, enabled: true }] }); }}>
                        <option value="">Choose a product…</option>
                        {products.filter((p) => !cat.products.some((x) => x.slug === p.slug)).map((p) => <option key={p.slug} value={p.slug}>{p.name} · {formatMoney(p.price)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {cat.options.map((o, i) => {
                    const setO = (patch: Partial<typeof o>) => setCat({ options: cat.options.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
                    return (
                      <div key={o.id} className="@container rounded-lg border border-black/10 bg-bg/50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="flex-1 text-[15px] font-semibold">{o.name || `Option ${i + 1}`}</span>
                          <RowTools i={i} n={cat.options.length} onMove={(to) => setCat({ options: moved(cat.options, i, to) })} onRemove={cat.options.length > 1 ? () => setCat({ options: cat.options.filter((_, k) => k !== i) }) : undefined} removeLabel={`Remove ${o.name || "option"}`} />
                        </div>
                        <div className="grid gap-4 @lg:grid-cols-[auto_minmax(0,1fr)]">
                          <Photo value={o.image} onChange={(v) => setO({ image: v })} label={o.name || "this option"} />
                          <div className="grid gap-4 @md:grid-cols-[minmax(0,1fr)_minmax(0,160px)]">
                            <Text id={`${o.id}-n`} label="Name" value={o.name} max={60} placeholder="e.g. Brass Ganesha" onChange={(v) => setO({ name: v })} />
                            <Rupees id={`${o.id}-p`} label="Price" value={o.price} onChange={(v) => setO({ price: v })} />
                          </div>
                        </div>
                        <div className="mt-4 grid gap-4 @xl:grid-cols-[auto_minmax(0,1fr)]">
                          <Footprint w={o.w} h={o.h} onChange={(w, h) => setO({ w, h })} />
                          <div className="grid content-start gap-4 @md:grid-cols-2">
                            <ShapeSelect id={`${o.id}-s`} value={o.shape} onChange={(v) => setO({ shape: v })} />
                            <Num id={`${o.id}-h`} label="Height" value={o.heightCm} min={0.5} max={30} step={0.5} suffix="cm" onChange={(v) => setO({ heightCm: v })} />
                            <Colour id={`${o.id}-c`} label="Colour (3D and without a photo)" value={o.color} onChange={(v) => setO({ color: v })} />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          {o.details.map((d, k) => (
                            <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2">
                              <input className="field" aria-label="Detail name" placeholder="e.g. Weight" maxLength={30} value={d.label} onChange={(e) => setO({ details: o.details.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })} />
                              <input className="field" aria-label="Detail value" placeholder="e.g. 180 g" maxLength={40} value={d.value} onChange={(e) => setO({ details: o.details.map((x, j) => (j === k ? { ...x, value: e.target.value } : x)) })} />
                              <button type="button" className="icon-btn is-danger self-center" aria-label="Remove detail" onClick={() => setO({ details: o.details.filter((_, j) => j !== k) })}><Trash2 size={18} aria-hidden /></button>
                            </div>
                          ))}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {o.details.length < 6 && <button type="button" className="text-btn" onClick={() => setO({ details: [...o.details, { label: "", value: "" }] })}><Plus size={16} aria-hidden /> Add detail (size, weight…)</button>}
                            <Toggle label="Offered" checked={o.enabled} onChange={(v) => setO({ enabled: v })} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {cat.options.length < 40 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCat({ options: [...cat.options, { id: nid(), name: "", price: 0, image: null, w: 1, h: 1, heightCm: 6, shape: "block", color: "#c49a62", details: [], enabled: true }] })}><Plus size={18} aria-hidden /> Add option</button>}
                </div>
              )}
              <div className="mt-6 border-t border-black/10 pt-4">
                <button type="button" className="text-btn is-danger" onClick={async () => { if (await confirm({ title: `Delete “${cat.name || "this category"}”?`, body: "Customers won’t see it in the builder. Boxes already ordered keep their contents.", confirmLabel: "Delete category", danger: true })) { const rest = b.categories.filter((c) => c.id !== cat.id); up({ categories: rest }); setCatId(rest[0]?.id ?? ""); } }}><Trash2 size={18} aria-hidden /> Delete category</button>
              </div>
            </Panel>
          ) : <Panel><p className="text-muted">No categories yet. Add one to let customers fill their box.</p></Panel>}
        </div>
      )}

      {tab === "sizes" && (
        <Panel title="Box sizes" description={`Each space is ${b.cellCm} cm square (change it under General). The depth grows by itself when something tall goes in.`}>
          <ul className="space-y-3">
            {b.sizes.map((z, i) => {
              const setZ = (patch: Partial<typeof z>) => up({ sizes: b.sizes.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
              return (
                <li key={z.id} className="@container rounded-lg border border-black/10 bg-bg/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex-1 text-[15px] font-semibold tabular-nums">{z.rows} × {z.cols} <span className="font-normal text-muted">· {z.cols * z.rows} spaces · {z.cols * b.cellCm + 1} × {z.rows * b.cellCm + 1} cm outside</span></span>
                    <RowTools i={i} n={b.sizes.length} onMove={(to) => up({ sizes: moved(b.sizes, i, to) })} onRemove={b.sizes.length > 1 ? () => up({ sizes: b.sizes.filter((_, k) => k !== i) }) : undefined} removeLabel={`Remove ${z.name}`} />
                  </div>
                  <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-5">
                    <Text id={`${z.id}-n`} label="Name" value={z.name} max={30} onChange={(v) => setZ({ name: v })} />
                    <Num id={`${z.id}-c`} label="Spaces across" value={z.cols} min={2} max={10} onChange={(v) => setZ({ cols: v, id: z.id })} />
                    <Num id={`${z.id}-r`} label="Spaces deep" value={z.rows} min={2} max={10} onChange={(v) => setZ({ rows: v })} />
                    <Num id={`${z.id}-d`} label="Depth" value={z.depthCm} min={4} max={40} step={0.5} suffix="cm" onChange={(v) => setZ({ depthCm: v })} />
                    <Rupees id={`${z.id}-p`} label="Price" value={z.price} onChange={(v) => setZ({ price: v })} />
                  </div>
                  <div className="mt-2"><Toggle label="Offered" checked={z.enabled} onChange={(v) => setZ({ enabled: v })} /></div>
                </li>
              );
            })}
          </ul>
          {b.sizes.length < 16 && <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => up({ sizes: [...b.sizes, { id: nid(), name: "New size", cols: 5, rows: 4, price: 0, depthCm: 9, enabled: true }] })}><Plus size={18} aria-hidden /> Add a size</button>}
        </Panel>
      )}

      {tab === "decor" && (
        <div className="space-y-6">
          <DecorList title="Box" description="The paper or wood the box is made of. A photo shows on the tile; without one, the colour and pattern draw the box." list={b.finishes} onChange={(l) => up({ finishes: l })} withPattern addLabel="Add a box finish" />
          <DecorList title="Ribbon" description="Tied around the box when it is sealed." list={b.ribbons} onChange={(l) => up({ ribbons: l })} addLabel="Add a ribbon" />
          <DecorList title="Filler" description="Fills the empty spaces and pads every item." list={b.fillers} onChange={(l) => up({ fillers: l })} addLabel="Add a filler" />
          <DecorList title="Wax seal" description="Stamped with the customer’s letter. Leave this list empty to offer no seal." list={b.seals} onChange={(l) => up({ seals: l })} min={0} addLabel="Add a wax colour" />
        </div>
      )}

      {tab === "card" && (
        <div className="space-y-6">
          <DecorList title="Card paper" description="The handmade card that sits on top. Handwriting styles (Kalam, Caveat, Homemade Apple) are built in; Kalam also writes Hindi." list={b.card.papers} onChange={(l) => up({ card: { ...b.card, papers: l } })} addLabel="Add a paper" />
          <Panel title="Message and voice note">
            <div className="grid gap-4 @md:grid-cols-2">
              <Num id="msg-max" label="Longest message" value={b.card.maxMessage} min={40} max={600} suffix="characters" onChange={(v) => up({ card: { ...b.card, maxMessage: v } })} />
              <Rupees id="voice-p" label="Voice note price" value={b.card.voiceNote.price} onChange={(v) => up({ card: { ...b.card, voiceNote: { ...b.card.voiceNote, price: v } } })} hint="0 = free" />
            </div>
            <div className="mt-3"><Toggle label="Offer a voice note" hint="Customers record or upload it on their order page. A QR on the card plays it; print it from the order’s packing plan." checked={b.card.voiceNote.enabled} onChange={(v) => up({ card: { ...b.card, voiceNote: { ...b.card.voiceNote, enabled: v } } })} /></div>
          </Panel>
        </div>
      )}

      {tab === "own" && (
        <Panel title="Space for the customer’s own gift" description="Customers keep spaces free for something of theirs and get it to you. You pack it in with everything else.">
          <Toggle label="Offer “Leave a space for your own gift”" checked={b.ownGift.enabled} onChange={(v) => up({ ownGift: { ...b.ownGift, enabled: v } })} />
          {b.ownGift.enabled && !b.ownGift.address.trim() && <p className="mt-2 rounded bg-amber-100 px-3 py-2 text-[14px] text-amber-900" role="status">Customers won’t see this option until you add the drop-off and courier address below.</p>}
          <div className="mt-4 grid gap-4 @md:grid-cols-2">
            <Num id="own-max" label="Largest space" value={b.ownGift.maxCells} min={1} max={16} suffix="spaces" onChange={(v) => up({ ownGift: { ...b.ownGift, maxCells: v } })} />
            <Rupees id="own-fee" label="Pickup fee" value={b.ownGift.pickupFee} onChange={(v) => up({ ownGift: { ...b.ownGift, pickupFee: v } })} />
            <Text id="own-area" label="Where you pick up from" value={b.ownGift.pickupArea} max={80} placeholder="e.g. within Jaipur" onChange={(v) => up({ ownGift: { ...b.ownGift, pickupArea: v } })} />
            <div className="flex items-end"><Toggle label="Offer pickup" checked={b.ownGift.pickupEnabled} onChange={(v) => up({ ownGift: { ...b.ownGift, pickupEnabled: v } })} /></div>
            <div className="@md:col-span-2"><Text area id="own-addr" label="Drop-off and courier address" value={b.ownGift.address} max={400} placeholder="Workshop name, street, city, PIN, and the hours someone is there" hint="Sent to the customer with their order. Never shown on the store." onChange={(v) => up({ ownGift: { ...b.ownGift, address: v } })} /></div>
          </div>
        </Panel>
      )}

      {tab === "general" && (
        <Panel title="The box builder">
          <Toggle label="Take custom box orders" hint="Off hides the builder and its homepage section." checked={b.enabled} onChange={(v) => up({ enabled: v })} />
          <div className="mt-4 grid gap-4 @md:grid-cols-2">
            <Text id="g-title" label="Page title" value={b.title} max={60} onChange={(v) => up({ title: v })} />
            <Num id="g-pack" label="Packing time" value={b.packDays} min={0} max={30} suffix="working days" onChange={(v) => up({ packDays: v })} />
            <div className="@md:col-span-2"><Text area id="g-intro" label="One line under the title" value={b.intro} max={240} onChange={(v) => up({ intro: v })} /></div>
            <Num id="g-cell" label="Size of one space" value={b.cellCm} min={2} max={15} step={0.5} suffix="cm" hint="Every size and 3D view uses this." onChange={(v) => up({ cellCm: v })} />
            <Num id="g-max" label="Same box, most per order" value={b.maxPerOrder} min={1} max={10} onChange={(v) => up({ maxPerOrder: v })} />
          </div>
        </Panel>
      )}

      <SaveBar dirty={dirty} pending={pending} onSave={save} onDiscard={() => { setB(initial); setDirty(false); setVer((n) => n + 1); }} />
    </div>
  );
}
