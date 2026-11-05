"use client";
import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ImageIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/ui/img";
import { uid, cn } from "@/lib/utils";
import { uploadFiles } from "./upload";
import { useConfirm } from "./confirm";
import type { OptionDisplay } from "@/lib/types";

export type EditValue = { key: string; id?: string; label: string; note?: string; hex: string; priceDelta: string; image: string; available: boolean };
export type EditGroup = { key: string; id?: string; name: string; display: OptionDisplay; required: boolean; values: EditValue[] };

const v = (label: string, extra: Partial<EditValue> = {}): EditValue => ({ key: uid(), label, hex: "#d9c3a0", priceDelta: "0", image: "", available: true, ...extra });

const PRESETS: Record<string, () => EditGroup> = {
  Scent: () => ({ key: uid(), name: "Scent", display: "button", required: true, values: ["Oud & Amber", "Sandalwood", "Vanilla Bean", "Lavender Fields", "Night Jasmine"].map((l) => v(l)) }),
  "Wax colour": () => ({ key: uid(), name: "Wax colour", display: "swatch", required: true, values: [["Ivory", "#efe6d2"], ["Amber", "#d9a05b"], ["Walnut", "#7a5634"], ["Sage", "#a9b59a"]].map(([l, hex]) => v(l, { hex })) }),
  "Label theme": () => ({ key: uid(), name: "Label theme", display: "dropdown", required: true, values: ["Classic", "Festive", "Birthday", "Anniversary"].map((l) => v(l)) }),
  Size: () => ({ key: uid(), name: "Size", display: "button", required: true, values: [v("200 g"), v("350 g", { priceDelta: "500" })] }),
  Custom: () => ({ key: uid(), name: "", display: "button", required: true, values: [v("")] }),
};

/** What each display looks like to the customer, in one line. */
export const DISPLAY_OPTIONS: { value: OptionDisplay; label: string; hint: string }[] = [
  { value: "button", label: "Buttons", hint: "A row of text buttons. Good for scents and sizes." },
  { value: "swatch", label: "Colour swatches", hint: "Round colour dots. Each value needs a colour." },
  { value: "candle", label: "Candle (animated)", hint: "A small candle in each value's colour; the chosen one is lit with a flickering flame." },
  { value: "dropdown", label: "Dropdown", hint: "A single list. Good for many values, like label themes." },
];
const usesColour = (d: OptionDisplay) => d === "swatch" || d === "candle";
const isHex = (h: string) => /^#[0-9a-f]{6}$/i.test(h);

function move<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** A small candle drawn in the value's colour; `lit` adds the flame. Matches what customers see. */
export function CandleIcon({ hex, lit, size = 40 }: { hex: string; lit: boolean; size?: number }) {
  const wax = isHex(hex) ? hex : "#d9c3a0";
  return (
    <svg viewBox="0 0 40 56" width={size} height={size * 1.4} aria-hidden="true" className="overflow-visible">
      {lit && (
        <g className="origin-[20px_16px] motion-safe:animate-[candle-flicker_1.6s_ease-in-out_infinite]">
          <ellipse cx="20" cy="12" rx="9" ry="11" fill="#ffd27a" opacity=".25" />
          <path d="M20 2c3.6 4.8 5.4 8 5.4 10.7A5.4 5.4 0 0 1 14.6 12.7C14.6 10 16.4 6.8 20 2Z" fill="#f6a43a" />
          <path d="M20 7c1.7 2.4 2.6 4 2.6 5.3a2.6 2.6 0 0 1-5.2 0c0-1.3.9-2.9 2.6-5.3Z" fill="#fff3c4" />
        </g>
      )}
      <line x1="20" y1="16" x2="20" y2="21" stroke="#3b2f22" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="9" y="20" width="22" height="33" rx="4" fill={wax} stroke="rgb(0 0 0 / .25)" strokeWidth="1" />
      <path d="M9 25c4 2 8-1 11 1.5S27 28 31 25" fill="none" stroke="rgb(255 255 255 / .45)" strokeWidth="1.4" />
    </svg>
  );
}

/** Live preview of how the option looks on the product page. Tap a value to see it selected. */
function OptionPreview({ g }: { g: EditGroup }) {
  const [sel, setSel] = useState(0);
  const vals = g.values.filter((x) => x.label.trim());
  if (!vals.length) return <p className="text-[14px] text-muted">Add a value to see the preview.</p>;
  const on = Math.min(sel, vals.length - 1);
  return (
    <div>
      <p className="mb-2 text-[14px] font-semibold">{g.name || "Option"}: <span className="font-normal">{vals[on].label}</span></p>
      {g.display === "dropdown" ? (
        <select aria-label="Preview" className="field max-w-xs" value={on} onChange={(e) => setSel(Number(e.target.value))}>{vals.map((x, i) => <option key={x.key} value={i}>{x.label}</option>)}</select>
      ) : (
        <div className="flex flex-wrap gap-2">
          {vals.map((x, i) => {
            const active = i === on;
            if (g.display === "candle") return (
              <button key={x.key} type="button" aria-pressed={active} aria-label={x.label} title={x.label} onClick={() => setSel(i)} className={cn("flex min-h-11 min-w-11 flex-col items-center justify-end rounded-lg px-1 pb-1 pt-2", active ? "bg-black/[.06] ring-1 ring-ink" : "hover:bg-black/5", !x.available && "opacity-40")}>
                <CandleIcon hex={x.hex} lit={active} size={28} />
              </button>
            );
            if (g.display === "swatch") return (
              <button key={x.key} type="button" aria-pressed={active} aria-label={x.label} title={x.label} onClick={() => setSel(i)} className={cn("flex h-11 w-11 items-center justify-center rounded-full", active && "ring-2 ring-ink", !x.available && "opacity-40")}>
                <span className="h-8 w-8 rounded-full border border-black/15" style={{ background: isHex(x.hex) ? x.hex : "#ccc" }} />
              </button>
            );
            return <button key={x.key} type="button" aria-pressed={active} onClick={() => setSel(i)} className={cn("min-h-11 rounded-lg border px-4 text-[15px]", active ? "border-ink bg-ink text-bg" : "border-black/20", !x.available && "line-through opacity-50")}>{x.label}</button>;
          })}
        </div>
      )}
    </div>
  );
}

export function OptionBuilder({ groups, onChange, productImages }: { groups: EditGroup[]; onChange: (g: EditGroup[]) => void; productImages: string[] }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [imgOpen, setImgOpen] = useState<string | null>(null);
  const confirm = useConfirm();
  const id = useId();
  const setGroup = (gi: number, patch: Partial<EditGroup>) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setValue = (gi: number, vi: number, patch: Partial<EditValue>) => setGroup(gi, { values: groups[gi].values.map((x, i) => (i === vi ? { ...x, ...patch } : x)) });

  async function uploadFor(gi: number, vi: number, file?: File) {
    if (!file) return;
    const k = groups[gi].values[vi].key;
    setUploading(k);
    try {
      const [u] = await uploadFiles([file]);
      setValue(gi, vi, { image: u });
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="space-y-6">
      <style>{`@keyframes candle-flicker{0%,100%{transform:scale(1) rotate(0)}30%{transform:scale(1.04,.96) rotate(-2deg)}60%{transform:scale(.97,1.05) rotate(2deg)}}`}</style>
      {groups.length === 0 && <p className="text-[15px] text-muted">No options yet: customers buy this product as it is. Add options like scent, wax colour or label theme so they can choose on the product page.</p>}
      {groups.map((g, gi) => {
        const gid = `${id}-${g.key}`;
        const display = DISPLAY_OPTIONS.find((d) => d.value === g.display);
        return (
          <fieldset key={g.key} className="min-w-0 rounded-xl border border-black/10 p-4 md:p-5">
            <legend className="px-1 text-[14px] font-semibold text-muted">Option {gi + 1}</legend>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <label className="label" htmlFor={`${gid}-n`}>Option name</label>
                <input id={`${gid}-n`} className="field" autoComplete="off" value={g.name} placeholder="e.g. Scent" onChange={(e) => setGroup(gi, { name: e.target.value })} />
              </div>
              <div className="min-w-0">
                <label className="label" htmlFor={`${gid}-d`}>Shown to customers as</label>
                <select id={`${gid}-d`} className="field" value={g.display} aria-describedby={`${gid}-dh`} onChange={(e) => setGroup(gi, { display: e.target.value as OptionDisplay })}>
                  {DISPLAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <p id={`${gid}-dh`} className="hint">{display?.hint}</p>
              </div>
            </div>
            <label className="check-row"><input type="checkbox" checked={g.required} onChange={(e) => setGroup(gi, { required: e.target.checked })} /><span className="text-[15px]">Customer must choose one</span></label>

            <h3 className="mb-3 mt-4 text-[15px] font-semibold">Values</h3>
            <ul className="space-y-3">
              {g.values.map((val, vi) => {
                const vid = `${gid}-${val.key}`;
                const hexBad = usesColour(g.display) && !isHex(val.hex);
                return (
                  <li key={val.key} className="min-w-0 rounded-lg border border-black/10 bg-bg/50 p-3">
                    <div className={cn("grid gap-4", usesColour(g.display) ? "sm:grid-cols-[minmax(0,1fr)_200px_140px]" : "sm:grid-cols-[minmax(0,1fr)_140px]")}>
                      <div className="min-w-0">
                        <div className="-mt-2 mb-1 flex items-center gap-1">
                          <label className="label !mb-0 flex-1" htmlFor={`${vid}-l`}>Value {vi + 1}</label>
                          <button type="button" aria-label={`Move ${val.label || `value ${vi + 1}`} up`} className="icon-btn" disabled={vi === 0} onClick={() => setGroup(gi, { values: move(g.values, vi, -1) })}><ArrowUp size={20} aria-hidden /></button>
                          <button type="button" aria-label={`Remove ${val.label || `value ${vi + 1}`}`} className="icon-btn is-danger -mr-2" disabled={g.values.length === 1} onClick={() => setGroup(gi, { values: g.values.filter((_, i) => i !== vi) })}><Trash2 size={20} aria-hidden /></button>
                        </div>
                        <input id={`${vid}-l`} className="field" autoComplete="off" placeholder="e.g. Sandalwood" value={val.label} onChange={(e) => setValue(gi, vi, { label: e.target.value })} />
                        {g.display === "candle" && (
                          <>
                            <label className="label mt-3" htmlFor={`${vid}-note`}>Scent notes <span className="font-normal text-muted">(optional, shown under the name)</span></label>
                            <input id={`${vid}-note`} className="field" autoComplete="off" maxLength={80} placeholder="e.g. resin · honey" value={val.note ?? ""} onChange={(e) => setValue(gi, vi, { note: e.target.value })} />
                          </>
                        )}
                      </div>
                      {usesColour(g.display) && (
                        <div className="min-w-0">
                          <label className="label sm:flex sm:min-h-11 sm:items-center sm:!mb-1 sm:-mt-2" htmlFor={`${vid}-h`}>Colour</label>
                          <div className="flex items-center gap-2">
                            <input type="color" aria-label={`Pick colour for ${val.label || `value ${vi + 1}`}`} className="h-12 w-12 shrink-0 cursor-pointer rounded-lg border border-black/15 p-1" value={isHex(val.hex) ? val.hex : "#cccccc"} onChange={(e) => setValue(gi, vi, { hex: e.target.value })} />
                            <input id={`${vid}-h`} className="field min-w-0 uppercase" autoComplete="off" spellCheck={false} maxLength={7} aria-invalid={hexBad} value={val.hex} onChange={(e) => setValue(gi, vi, { hex: e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}` })} />
                          </div>
                          {hexBad && <p className="error-text">Use a code like #C9A27E</p>}
                        </div>
                      )}
                      <div className="min-w-0">
                        <label className="label sm:flex sm:min-h-11 sm:items-center sm:!mb-1 sm:-mt-2" htmlFor={`${vid}-p`}>Price change (₹)</label>
                        <input id={`${vid}-p`} inputMode="decimal" autoComplete="off" className="field" placeholder="0" value={val.priceDelta} onChange={(e) => setValue(gi, vi, { priceDelta: e.target.value })} />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2">
                      <label className="check-row mr-auto"><input type="checkbox" checked={val.available} onChange={(e) => setValue(gi, vi, { available: e.target.checked })} /><span className="text-[15px]">In stock</span></label>
                      <button type="button" className="text-btn" aria-expanded={imgOpen === val.key} onClick={() => setImgOpen(imgOpen === val.key ? null : val.key)}>
                        {val.image ? <span className="relative h-7 w-7 overflow-hidden rounded"><Img src={val.image} alt="" fill sizes="28px" className="object-cover" /></span> : <ImageIcon size={18} aria-hidden />}
                        {val.image ? "Photo" : "Add photo"}
                      </button>
                    </div>
                    {imgOpen === val.key && (
                      <div className="mt-2 rounded-lg border border-black/10 bg-surface p-3">
                        <p className="mb-2 text-[14px] text-muted">Shown in the gallery when a customer picks “{val.label || "this value"}”.</p>
                        {productImages.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                            {productImages.map((u, k) => (
                              <button type="button" key={u} className={cn("relative aspect-square overflow-hidden rounded-md border", val.image === u ? "border-ink ring-2 ring-ink" : "border-black/10")} onClick={() => setValue(gi, vi, { image: u })} aria-label={`Use product photo ${k + 1}`} aria-pressed={val.image === u}><Img src={u} alt="" fill sizes="80px" className="object-cover" /></button>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <label className="btn btn-ghost btn-sm cursor-pointer">{uploading === val.key ? "Uploading…" : "Upload a photo"}<input type="file" accept="image/*" className="sr-only" onChange={(e) => uploadFor(gi, vi, e.target.files?.[0])} /></label>
                          {val.image && <button type="button" className="text-btn is-danger" onClick={() => setValue(gi, vi, { image: "" })}>Remove photo</button>}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => setGroup(gi, { values: [...g.values, v("", { hex: "#d9c3a0" })] })}><Plus size={18} aria-hidden /> Add value</button>

            <div className="mt-6 rounded-lg border border-dashed border-black/15 p-4">
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">Preview on the product page</p>
              <OptionPreview g={g} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-black/10 pt-3">
              <button type="button" aria-label={`Move option ${g.name || gi + 1} up`} className="icon-btn" disabled={gi === 0} onClick={() => onChange(move(groups, gi, -1))}><ArrowUp size={20} aria-hidden /></button>
              <button type="button" aria-label={`Move option ${g.name || gi + 1} down`} className="icon-btn" disabled={gi === groups.length - 1} onClick={() => onChange(move(groups, gi, 1))}><ArrowDown size={20} aria-hidden /></button>
              <button type="button" className="text-btn is-danger ml-auto" onClick={async () => { if (await confirm({ title: `Delete the “${g.name || "untitled"}” option?`, body: "Customers will no longer choose it. Saved orders keep what was chosen.", confirmLabel: "Delete option", danger: true })) onChange(groups.filter((_, i) => i !== gi)); }}><Trash2 size={18} aria-hidden />Delete option</button>
            </div>
          </fieldset>
        );
      })}
      <div>
        <p className="mb-2 text-[15px] font-semibold">Add an option</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESETS).map((k) => (
            <button key={k} type="button" disabled={groups.length >= 10} className="btn btn-ghost btn-sm" onClick={() => onChange([...groups, PRESETS[k]()])}><Plus size={18} aria-hidden /> {k}</button>
          ))}
        </div>
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
