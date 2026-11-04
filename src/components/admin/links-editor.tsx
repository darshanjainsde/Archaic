"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export type Link_ = { label: string; href: string };

export function LinksEditor({ links, onChange, max = 12, addLabel = "Add link" }: { links: Link_[]; onChange: (l: Link_[]) => void; max?: number; addLabel?: string }) {
  const set = (i: number, patch: Partial<Link_>) => onChange(links.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= links.length) return;
    const n = [...links];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input aria-label="Link text" className="field !min-h-[40px] !py-2" placeholder="Label" value={l.label} onChange={(e) => set(i, { label: e.target.value })} />
          <input aria-label="Link address" className="field !min-h-[40px] !py-2" placeholder="/shop or https://…" value={l.href} onChange={(e) => set(i, { href: e.target.value })} />
          <div className="flex">
            <button type="button" aria-label="Move up" className="rounded p-2 hover:bg-black/5 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
            <button type="button" aria-label="Move down" className="rounded p-2 hover:bg-black/5 disabled:opacity-30" disabled={i === links.length - 1} onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
            <button type="button" aria-label="Remove link" className="rounded p-2 text-sale hover:bg-red-50" onClick={() => onChange(links.filter((_, k) => k !== i))}><Trash2 size={15} /></button>
          </div>
        </div>
      ))}
      {links.length < max && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...links, { label: "", href: "/" }])}><Plus size={15} />{addLabel}</button>}
    </div>
  );
}

/** Editable list of plain strings (announcement messages, perks). */
export function StringListEditor({ items, onChange, placeholder, max = 10, addLabel = "Add" }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; addLabel?: string }) {
  return (
    <div className="space-y-2">
      {items.map((s, i) => (
        <div key={i} className="flex gap-2">
          <input aria-label={`${placeholder ?? "Item"} ${i + 1}`} className="field !min-h-[40px] !py-2" placeholder={placeholder} value={s} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
          <button type="button" aria-label="Remove" className="rounded p-2 text-sale hover:bg-red-50" onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 size={15} /></button>
        </div>
      ))}
      {items.length < max && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...items, ""])}><Plus size={15} />{addLabel}</button>}
    </div>
  );
}
