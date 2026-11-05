"use client";
import { useId, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Img } from "@/components/ui/img";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type PickableProduct = { slug: string; name: string; price: number; image: string | null; /** null = stock not tracked */ stock?: number | null };

const stockText = (p: PickableProduct) => (p.stock === undefined ? null : p.stock === null ? "Made to order" : p.stock <= 0 ? "Out of stock" : `${p.stock} in stock`);
const meta = (p: PickableProduct, withStock: boolean) => [formatMoney(p.price), withStock ? stockText(p) : null].filter(Boolean).join(" · ");

/**
 * Searchable product chooser that opens inline (not a popover, so it never runs off a phone screen).
 * Value is a product slug; "" means none.
 */
export function ProductPicker({ label, value, onChange, products, noneLabel = "None", hint, showStock = false }: { label: string; value: string; onChange: (slug: string) => void; products: PickableProduct[]; noneLabel?: string; hint?: string; showStock?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = products.find((p) => p.slug === value) ?? null;
  const missing = value && !current;
  const term = q.trim().toLowerCase();
  const list = useMemo(() => (term ? products.filter((p) => p.name.toLowerCase().includes(term)) : products), [products, term]);

  const choose = (slug: string) => { onChange(slug); setOpen(false); setQ(""); };

  return (
    <div className="min-w-0">
      <span className="label" id={`${id}-l`}>{label}</span>
      <button type="button" aria-expanded={open} aria-controls={`${id}-list`} aria-labelledby={`${id}-l ${id}-v`} onClick={() => setOpen((o) => !o)} className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-black/[.18] bg-white px-3 py-2 text-left hover:border-black/30">
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-field">{current?.image && <Img src={current.image} alt="" fill sizes="40px" className="object-cover" />}</span>
        <span id={`${id}-v`} className="min-w-0 flex-1">
          <span className="block truncate text-[16px]">{current ? current.name : missing ? `“${value}” (not active)` : noneLabel}</span>
          {current && <span className={cn("block text-[14px] tabular-nums", showStock && current.stock !== undefined && current.stock !== null && current.stock <= 0 ? "text-sale" : "text-muted")}>{meta(current, showStock)}</span>}
        </span>
        <ChevronDown size={20} aria-hidden className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {hint && <p className="hint">{hint}</p>}
      {missing && <p className="error-text">That product is not active any more. Pick another, or choose “{noneLabel}”.</p>}
      {open && (
        <div id={`${id}-list`} className="mt-2 rounded-lg border border-black/10 bg-surface p-2 shadow-sm">
          <label className="relative block">
            <span className="sr-only">Search products</span>
            <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="field !pl-10" placeholder="Search active products…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          </label>
          <ul role="listbox" aria-label={label} className="mt-2 max-h-[320px] overflow-y-auto overscroll-contain">
            <li role="option" aria-selected={!value}>
              <button type="button" onClick={() => choose("")} className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-black/5">
                <span className="h-10 w-10 shrink-0 rounded-md border border-dashed border-black/20" aria-hidden />
                <span className="min-w-0 flex-1 text-[15px]">{noneLabel}</span>
                {!value && <Check size={18} aria-hidden />}
              </button>
            </li>
            {list.map((p) => (
              <li key={p.slug} role="option" aria-selected={p.slug === value}>
                <button type="button" onClick={() => choose(p.slug)} className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-black/5">
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-field">{p.image && <Img src={p.image} alt="" fill sizes="40px" className="object-cover" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{p.name}</span>
                    <span className={cn("block text-[14px] tabular-nums", showStock && p.stock !== undefined && p.stock !== null && p.stock <= 0 ? "text-sale" : "text-muted")}>{meta(p, showStock)}</span>
                  </span>
                  {p.slug === value && <Check size={18} aria-hidden />}
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="p-4 text-center text-[14px] text-muted">No active product matches “{q}”.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
