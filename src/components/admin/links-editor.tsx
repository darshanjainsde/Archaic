"use client";
import { useId } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { NavLink } from "@/lib/settings-schema";

export type Link_ = NavLink;
const blank = (): NavLink => ({ label: "", href: "/", menu: "none", categorySlug: "" });

/**
 * Editable list of links. With `categories` (header menu), each link can also open a dropdown:
 * every category, or the sub-categories of one category (picking one also fills the address).
 * Every link is a small card with visible labels, so it reads the same on a phone and a computer.
 */
export function LinksEditor({ links, onChange, max = 12, addLabel = "Add link", categories }: { links: NavLink[]; onChange: (l: NavLink[]) => void; max?: number; addLabel?: string; categories?: { slug: string; name: string; parentId?: string | null }[] }) {
  const id = useId();
  const set = (i: number, patch: Partial<NavLink>) => onChange(links.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= links.length) return;
    const n = [...links];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  const setMenu = (i: number, v: string) => {
    if (v === "none") return set(i, { menu: "none", categorySlug: "" });
    if (v === "all") return set(i, { menu: "all", categorySlug: "", href: links[i].href === "/" ? "/shop" : links[i].href });
    const slug = v.replace(/^cat:/, "");
    const cat = categories?.find((c) => c.slug === slug);
    set(i, { menu: "category", categorySlug: slug, href: `/shop?category=${slug}`, label: links[i].label || cat?.name || "" });
  };
  const withMenu = Boolean(categories);
  const tops = categories?.filter((c) => !c.parentId) ?? [];
  return (
    <div className="space-y-3">
      {links.map((l, i) => {
        const f = `${id}-${i}`;
        return (
          <fieldset key={i} className="rounded-lg border border-black/10 p-4">
            <legend className="sr-only">Link {i + 1}</legend>
            <div className={withMenu ? "grid gap-4 md:grid-cols-3" : "grid gap-4 md:grid-cols-2"}>
              <div className="min-w-0"><label className="label" htmlFor={`${f}-t`}>Text</label><input id={`${f}-t`} className="field" autoComplete="off" placeholder="e.g. Gift sets" value={l.label} onChange={(e) => set(i, { label: e.target.value })} /></div>
              <div className="min-w-0"><label className="label" htmlFor={`${f}-h`}>Goes to</label><input id={`${f}-h`} className="field" autoComplete="off" spellCheck={false} placeholder="/shop or https://…" value={l.href} onChange={(e) => set(i, { href: e.target.value })} /></div>
              {withMenu && (
                <div className="min-w-0">
                  <label className="label" htmlFor={`${f}-m`}>Dropdown</label>
                  <select id={`${f}-m`} className="field" value={l.menu === "category" ? `cat:${l.categorySlug}` : l.menu} onChange={(e) => setMenu(i, e.target.value)}>
                    <option value="none">No dropdown</option>
                    <option value="all">All categories</option>
                    {(tops.length ? tops : categories!).map((c) => <option key={c.slug} value={`cat:${c.slug}`}>Sub-categories of {c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex">
                <button type="button" aria-label={`Move link ${i + 1} up`} className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={20} aria-hidden /></button>
                <button type="button" aria-label={`Move link ${i + 1} down`} className="icon-btn" disabled={i === links.length - 1} onClick={() => move(i, 1)}><ArrowDown size={20} aria-hidden /></button>
              </div>
              <button type="button" className="text-btn is-danger" onClick={() => onChange(links.filter((_, k) => k !== i))}><Trash2 size={18} aria-hidden />Remove</button>
            </div>
          </fieldset>
        );
      })}
      {links.length < max && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...links, blank()])}><Plus size={18} aria-hidden />{addLabel}</button>}
      {withMenu && <p className="hint">A dropdown shows category pictures and sub-categories on computers, and an expandable list in the phone menu. Categories come from Admin → Categories.</p>}
    </div>
  );
}

/** Editable list of plain strings (announcement messages, perks). */
export function StringListEditor({ items, onChange, placeholder, max = 10, addLabel = "Add" }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; addLabel?: string }) {
  return (
    <div className="space-y-2">
      {items.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <input aria-label={`${addLabel.replace(/^Add /, "")} ${i + 1}`} className="field" autoComplete="off" placeholder={placeholder} value={s} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
          <button type="button" aria-label={`Remove ${addLabel.replace(/^Add /, "")} ${i + 1}`} className="icon-btn is-danger" onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 size={20} aria-hidden /></button>
        </div>
      ))}
      {items.length < max && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...items, ""])}><Plus size={18} aria-hidden />{addLabel}</button>}
    </div>
  );
}
