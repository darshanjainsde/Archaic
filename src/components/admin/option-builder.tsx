"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/ui/img";
import { uid } from "@/lib/utils";
import { uploadFiles } from "./upload";
import type { OptionDisplay } from "@/lib/types";

export type EditValue = { key: string; id?: string; label: string; hex: string; priceDelta: string; image: string; available: boolean };
export type EditGroup = { key: string; id?: string; name: string; display: OptionDisplay; required: boolean; values: EditValue[] };

const v = (label: string, extra: Partial<EditValue> = {}): EditValue => ({ key: uid(), label, hex: "#d9c3a0", priceDelta: "0", image: "", available: true, ...extra });

const PRESETS: Record<string, () => EditGroup> = {
  Scent: () => ({ key: uid(), name: "Scent", display: "button", required: true, values: ["Oud & Amber", "Sandalwood", "Vanilla Bean", "Lavender Fields", "Night Jasmine"].map((l) => v(l)) }),
  "Wax colour": () => ({ key: uid(), name: "Wax colour", display: "swatch", required: true, values: [["Ivory", "#efe6d2"], ["Amber", "#d9a05b"], ["Walnut", "#7a5634"], ["Sage", "#a9b59a"]].map(([l, hex]) => v(l, { hex })) }),
  "Label theme": () => ({ key: uid(), name: "Label theme", display: "dropdown", required: true, values: ["Classic", "Festive", "Birthday", "Anniversary"].map((l) => v(l)) }),
  Size: () => ({ key: uid(), name: "Size", display: "button", required: true, values: [v("200 g"), v("350 g", { priceDelta: "500" })] }),
  Custom: () => ({ key: uid(), name: "", display: "button", required: true, values: [v("")] }),
};

function move<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function OptionBuilder({ groups, onChange, productImages }: { groups: EditGroup[]; onChange: (g: EditGroup[]) => void; productImages: string[] }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const setGroup = (gi: number, patch: Partial<EditGroup>) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setValue = (gi: number, vi: number, patch: Partial<EditValue>) => setGroup(gi, { values: groups[gi].values.map((x, i) => (i === vi ? { ...x, ...patch } : x)) });

  async function uploadFor(gi: number, vi: number, file?: File) {
    if (!file) return;
    const k = groups[gi].values[vi].key;
    setUploading(k);
    try {
      const [u] = await uploadFiles([file]);
      setValue(gi, vi, { image: u });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="space-y-4">
      {groups.length === 0 && <p className="text-[14px] text-muted">No options. Customers buy this product as it is. Add options like scent, colour or label theme so they can choose on the product page.</p>}
      {groups.map((g, gi) => (
        <fieldset key={g.key} className="rounded-lg border border-black/10 p-3 md:p-4">
          <legend className="sr-only">Option group {gi + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
            <div>
              <label className="label" htmlFor={`g-${g.key}`}>Option name</label>
              <input id={`g-${g.key}`} className="field" value={g.name} placeholder="e.g. Scent" onChange={(e) => setGroup(gi, { name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor={`d-${g.key}`}>Shown as</label>
              <select id={`d-${g.key}`} className="field" value={g.display} onChange={(e) => setGroup(gi, { display: e.target.value as OptionDisplay })}>
                <option value="button">Buttons</option><option value="swatch">Colour swatches</option><option value="dropdown">Dropdown</option>
              </select>
            </div>
            <div className="flex items-end gap-1">
              <button type="button" aria-label="Move option up" className="rounded p-2 hover:bg-black/5 disabled:opacity-30" disabled={gi === 0} onClick={() => onChange(move(groups, gi, -1))}><ArrowUp size={16} /></button>
              <button type="button" aria-label="Move option down" className="rounded p-2 hover:bg-black/5 disabled:opacity-30" disabled={gi === groups.length - 1} onClick={() => onChange(move(groups, gi, 1))}><ArrowDown size={16} /></button>
              <button type="button" aria-label="Delete option" className="rounded p-2 text-sale hover:bg-red-50" onClick={() => confirm(`Delete the “${g.name || "untitled"}” option?`) && onChange(groups.filter((_, i) => i !== gi))}><Trash2 size={16} /></button>
            </div>
          </div>
          <label className="mt-2 flex items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={g.required} onChange={(e) => setGroup(gi, { required: e.target.checked })} /> Customer must choose one</label>

          <div className="mt-3 space-y-2">
            <div className="hidden grid-cols-[1fr_110px_120px_80px_92px] gap-2 px-1 text-[12px] font-semibold text-muted md:grid">
              <span>Value</span><span>{g.display === "swatch" ? "Colour" : ""}</span><span>Price change (₹)</span><span>Image</span><span></span>
            </div>
            {g.values.map((val, vi) => (
              <div key={val.key} className="grid grid-cols-2 items-center gap-2 rounded-md bg-field/60 p-2 md:grid-cols-[1fr_110px_120px_80px_92px] md:bg-transparent md:p-0">
                <input aria-label="Value label" className="field col-span-2 !min-h-[40px] !py-2 md:col-span-1" placeholder="e.g. Sandalwood" value={val.label} onChange={(e) => setValue(gi, vi, { label: e.target.value })} />
                <div>
                  {g.display === "swatch" ? (
                    <div className="flex items-center gap-1">
                      <input type="color" aria-label="Swatch colour" className="h-10 w-10 cursor-pointer rounded border border-black/10" value={/^#[0-9a-f]{6}$/i.test(val.hex) ? val.hex : "#cccccc"} onChange={(e) => setValue(gi, vi, { hex: e.target.value })} />
                      <input aria-label="Swatch hex" className="field !min-h-[40px] w-full !px-2 !py-2 text-[13px]" value={val.hex} onChange={(e) => setValue(gi, vi, { hex: e.target.value })} />
                    </div>
                  ) : <span className="hidden md:block" />}
                </div>
                <input aria-label="Price change in rupees" inputMode="decimal" className="field !min-h-[40px] !py-2" placeholder="0" value={val.priceDelta} onChange={(e) => setValue(gi, vi, { priceDelta: e.target.value })} />
                <div className="flex items-center gap-1">
                  <details className="relative">
                    <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center overflow-hidden rounded border border-black/10 bg-surface" aria-label="Choose image for this value">
                      {val.image ? <span className="relative block h-full w-full"><Img src={val.image} alt="" fill sizes="40px" className="object-cover" /></span> : uploading === val.key ? "…" : <Upload size={14} />}
                    </summary>
                    <div className="absolute left-0 z-20 mt-1 w-64 rounded-lg border border-black/10 bg-surface p-2 shadow-lg">
                      <p className="mb-1 text-[12px] text-muted">Shown in the gallery when this value is picked</p>
                      <div className="grid grid-cols-4 gap-1">
                        {productImages.map((u) => (
                          <button type="button" key={u} className="relative aspect-square overflow-hidden rounded border border-black/10" onClick={() => setValue(gi, vi, { image: u })} aria-label="Use this product image"><Img src={u} alt="" fill sizes="56px" className="object-cover" /></button>
                        ))}
                      </div>
                      <label className="btn btn-ghost btn-sm mt-2 w-full">Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadFor(gi, vi, e.target.files?.[0])} /></label>
                      {val.image && <button type="button" className="mt-1 w-full text-[13px] text-sale" onClick={() => setValue(gi, vi, { image: "" })}>Remove image</button>}
                    </div>
                  </details>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-1 md:col-span-1">
                  <label className="flex items-center gap-1 text-[12px]" title="Available"><input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={val.available} onChange={(e) => setValue(gi, vi, { available: e.target.checked })} />In stock</label>
                  <div className="flex">
                    <button type="button" aria-label="Move value up" className="rounded p-1 hover:bg-black/5 disabled:opacity-30" disabled={vi === 0} onClick={() => setGroup(gi, { values: move(g.values, vi, -1) })}><ArrowUp size={14} /></button>
                    <button type="button" aria-label="Remove value" className="rounded p-1 text-sale hover:bg-red-50 disabled:opacity-30" disabled={g.values.length === 1} onClick={() => setGroup(gi, { values: g.values.filter((_, i) => i !== vi) })}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => setGroup(gi, { values: [...g.values, v("", { hex: "#d9c3a0" })] })}><Plus size={15} /> Add value</button>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14px] font-medium">Add option:</span>
        {Object.keys(PRESETS).map((k) => (
          <button key={k} type="button" disabled={groups.length >= 10} className="btn btn-ghost btn-sm" onClick={() => onChange([...groups, PRESETS[k]()])}><Plus size={14} /> {k}</button>
        ))}
      </div>
    </div>
  );
}

/** Parses a signed rupee string ("-50", "120.5") into paise. */
export function signedRupees(s: string): number | null {
  const t = s.replace(/[₹,\s]/g, "");
  if (t === "" || t === "-") return 0;
  if (!/^-?\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}
